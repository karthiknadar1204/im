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
    // Validate user authentication
    const user = await currentUser();
    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user exists in database
    const dbUser = await db.select().from(users).where(eq(users.clerkId, user.id));
    if (!dbUser[0]) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    
    // Extract form data
    const modelName = formData.get('modelName') as string;
    const gender = formData.get('gender') as string;
    const trainingData = formData.get('trainingData') as File;
    
    // Validate required fields
    if (!modelName || !gender || !trainingData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!trainingData.name.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Training data must be a ZIP file' },
        { status: 400 }
      );
    }
    
    // Convert File to Buffer for R2 upload
    const bytes = await trainingData.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Upload to Cloudflare R2
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

    // Generate signed URL for the uploaded file (valid for 1 hour)
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET,
      Key: r2Key,
    });
    
    const signedUrl = await getSignedUrl(r2, getObjectCommand, { expiresIn: 3600 });

    // Generate model ID using user ID, model name, and date
    const timestamp = Date.now();
    const dateStr = new Date(timestamp).toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD format
    const modelNameSlug = modelName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const modelId = `model_${dbUser[0].id}_${modelNameSlug}_${dateStr}`;

    // creating the model
    await replicate.models.create("karthiknadar1204",modelId,{
        visibility:"private",
        hardware:"gpu-a100-large",
    })

    //training the created model
    const training = await replicate.trainings.create(
        "ostris",
        "flux-dev-lora-trainer",
        "26dce37af90b9d997eeb970d92e47de3064d46c300504ae376c75bef6a9022d2",
        {
          // You need to create a model on Replicate that will be the destination for the trained version.
          destination: `karthiknadar1204/${modelId}`,
          input: {
            steps: 1000,
            resolution: "1024",
            input_images: signedUrl,
            trigger_word: "omgx",
          },
          webhook:`${WEBHOOK_URL}/api/webhook/training?userId=${dbUser[0].id}&modelId=${modelId}&fileName=${trainingData.name}`,
          webhook_events_filter: ["completed"], // optional
        }
      );

    console.log(training)
    
    // Use the actual training ID from Replicate response
    const trainingJobId = training.id;
    console.log(trainingJobId)
    
    // Store training data in database with the actual Replicate training ID
    const [trainingRecord] = await db.insert(modelTraining).values({
      userId: dbUser[0].id,
      modelName,
      gender,
      trainingDataUrl: `${process.env.CLOUDFLARE_ENDPOINT}/${process.env.CLOUDFLARE_BUCKET}/${r2Key}`,
      status: training.status, // Use status from Replicate response
      trainingJobId,
      modelId,
      trainingProgress: 0,
      // Don't store the training model version - we'll get the final version from the webhook when training completes
    }).returning();

    // TODO: Implement actual model training logic here
    // This could involve:
    // 1. Calling a machine learning service (e.g., Replicate, Hugging Face)
    // 2. Starting the training process
    // 3. Updating the training status in the database


    
    return NextResponse.json({
      success: true,
      message: 'Model training started successfully',
      trainingJobId,
      modelName,
      gender,
      status: training.status || 'pending', // Use actual status from Replicate
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