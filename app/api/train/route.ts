import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/configs/db';
import { users, modelTraining } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import { PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2=new S3Client({
    region:"auto",
    endpoint:process.env.CLOUDFLARE_ENDPOINT,
    credentials:{
        accessKeyId:process.env.ACCESS_KEY_ID,
        secretAccessKey:process.env.SECRET_ACCESS_KEY
    }
})


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

    // Generate training job ID
    const trainingJobId = `train_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate signed URL for the uploaded file (valid for 1 hour)
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET,
      Key: r2Key,
    });
    
    const signedUrl = await getSignedUrl(r2, getObjectCommand, { expiresIn: 3600 });
    
    // Store training data in database
    const [trainingRecord] = await db.insert(modelTraining).values({
      userId: dbUser[0].id,
      modelName,
      gender,
      trainingDataUrl: `${process.env.CLOUDFLARE_ENDPOINT}/${process.env.CLOUDFLARE_BUCKET}/${r2Key}`,
      status: 'pending',
      trainingJobId,
      trainingProgress: 0,
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
      status: 'pending',
      userId: dbUser[0].id,
      trainingId: trainingRecord.id,
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