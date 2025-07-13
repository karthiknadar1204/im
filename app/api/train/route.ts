import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/configs/db';
import { users } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET,
      Key: `training-data/${Date.now()}-${trainingData.name}`,
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
    
    // TODO: Implement actual model training logic here
    // This could involve:
    // 1. Uploading the ZIP file to cloud storage
    // 2. Calling a machine learning service (e.g., Replicate, Hugging Face)
    // 3. Starting the training process
    // 4. Returning a training job ID
    
    // For now, return a mock response
    const trainingJobId = `train_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return NextResponse.json({
      success: true,
      message: 'Model training started successfully',
      trainingJobId,
      modelName,
      gender,
      status: 'pending',
      userId: dbUser[0].id
    });
    
  } catch (error) {
    console.error('Error in train API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}