import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/configs/db';
import { users, modelTraining } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import { PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import Replicate from "replicate";

const r2=new S3Client({
    region:"auto",
    endpoint:process.env.CLOUDFLARE_ENDPOINT,
    credentials:{
        accessKeyId:process.env.ACCESS_KEY_ID,
        secretAccessKey:process.env.SECRET_ACCESS_KEY
    }
})

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  const WEBHOOK_URL=process.env.WEBHOOK_URL

export async function POST(request: NextRequest) {
  try {

    const user = await currentUser();
    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }


    const dbUser = await db.select().from(users).where(eq(users.clerkId, user.id));
    if (!dbUser[0]) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const userId = dbUser[0].id;

    const formData = await request.formData();
    

    const modelName = formData.get('modelName') as string;
    const gender = formData.get('gender') as string;
    const trainingData = formData.get('trainingData') as File;
    

    if (!modelName || !gender || !trainingData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    

    if (!trainingData.name.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Training data must be a ZIP file' },
        { status: 400 }
      );
    }
    

    const bytes = await trainingData.arrayBuffer();
    const buffer = Buffer.from(bytes);
    

    const r2Key = `training-data/${Date.now()}-${trainingData.name}`;
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET,
      Key: r2Key,
      Body: buffer,
      ContentType: trainingData.type,
    });

    const response = await r2.send(command);
    if (response.$metadata.httpStatusCode !== 200) {
      return NextResponse.json(
        { error: "Failed to upload training data to R2" },
        { status: 500 }
      );
    }


    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET,
      Key: r2Key,
    });
    
    const signedUrl = await getSignedUrl(r2, getObjectCommand, { expiresIn: 3600 });


    const timestamp = Date.now();
    const dateStr = new Date(timestamp).toISOString().split('T')[0].replace(/-/g, ''); 
    const modelNameSlug = modelName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const modelId = `model_${dbUser[0].id}_${modelNameSlug}_${dateStr}`;


    await replicate.models.create("karthiknadar1204",modelId,{
        visibility:"private",
        hardware:"gpu-a100-large",
    })


    const training = await replicate.trainings.create(
        "ostris",
        "flux-dev-lora-trainer",
        "26dce37af90b9d997eeb970d92e47de3064d46c300504ae376c75bef6a9022d2",
        {

          destination: `karthiknadar1204/${modelId}`,
          input: {
            steps: 1000,
            resolution: "1024",
            input_images: signedUrl,
            trigger_word: "omgx",
          },
          webhook:`${WEBHOOK_URL}/api/webhook/training?userId=${dbUser[0].id}&modelId=${modelId}&fileName=${trainingData.name}`,
          webhook_events_filter: ["completed"]
        }
      );

    console.log(training)
    

    const trainingJobId = training.id;
    console.log(trainingJobId)
    

    const [trainingRecord] = await db.insert(modelTraining).values({
      userId: dbUser[0].id,
      modelName,
      gender,
      trainingDataUrl: `${process.env.CLOUDFLARE_ENDPOINT}/${process.env.CLOUDFLARE_BUCKET}/${r2Key}`,
      status: training.status,
      trainingJobId,
      modelId,
      trainingProgress: 0,

    }).returning();
    try {

    } catch (error) {
      console.error("Failed to increment usage:", error);

    }


    
    return NextResponse.json({
      success: true,
      message: 'Model training started successfully',
      trainingJobId,
      modelName,
      gender,
      status: training.status || 'pending', 
      userId: dbUser[0].id,
      trainingId: trainingRecord.id,
      modelId,
      signedUrl,
      r2Key
    });
    
  } catch (error) {
    console.error('Error in train API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}