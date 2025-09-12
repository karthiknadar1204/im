"use server";

import Replicate from "replicate";
import { imageGenerationSchema, type ImageGenerationFormValues } from "@/lib/schemas/image-generation";
import { revalidatePath } from "next/cache";
import { db } from "@/configs/db";
import { generatedImages, users } from "@/configs/schema";
import { eq, desc } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { validateReplicateUrl, generateR2PublicUrl } from "@/lib/utils";
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Cloudflare R2 client for storing images
const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID!,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
  },
});

// Function to download and store image to R2 with retry logic
async function downloadAndStoreImage(replicateUrl: string, userId: number, imageId: string, index: number, retryCount = 0): Promise<string> {
  const maxRetries = 2;
  
  try {
    // Download the image from Replicate with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(replicateUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageDownloader/1.0)',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    const imageBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);
    
    // Extract file extension from URL
    const urlParts = replicateUrl.split('.');
    const extension = urlParts[urlParts.length - 1] || 'webp';
    
    // Create R2 key
    const r2Key = `generated-images/${userId}/${imageId}/image-${index + 1}.${extension}`;
    
    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET!,
      Key: r2Key,
      Body: buffer,
      ContentType: response.headers.get('content-type') || `image/${extension}`,
      CacheControl: 'public, max-age=31536000', // Cache for 1 year
    });

    await r2.send(command);
    
    // Return the public URL using the utility function
    return generateR2PublicUrl(process.env.CLOUDFLARE_BUCKET!, r2Key);
  } catch (error) {
    console.error('Error downloading and storing image:', error);
    
    // Check if it's a timeout error
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('Download timeout for URL:', replicateUrl);
      } else if (error.message.includes('Connect Timeout')) {
        console.error('Connection timeout for URL:', replicateUrl);
      } else {
        console.error('Download error for URL:', replicateUrl, 'Error:', error.message);
      }
    }
    
    // Retry logic for network errors
    if (retryCount < maxRetries && error instanceof Error && 
        (error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('fetch failed'))) {
      console.log(`Retrying download (attempt ${retryCount + 1}/${maxRetries}) for URL:`, replicateUrl);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
      return downloadAndStoreImage(replicateUrl, userId, imageId, index, retryCount + 1);
    }
    
    // Fallback to original URL if download fails after retries
    return replicateUrl;
  }
}

export async function generateImage(formData: FormData) {
  try {
    // Parse and validate the form data using the schema
    const rawData = Object.fromEntries(formData.entries());
    
    // Convert string values to appropriate types for validation
    const parsedData = {
      ...rawData,
      promptGuidance: parseFloat(rawData.promptGuidance as string),
      numOutputs: parseInt(rawData.numOutputs as string),
      numInferenceSteps: parseInt(rawData.numInferenceSteps as string),
      outputQuality: parseInt(rawData.outputQuality as string),
    };

    // Validate the input using the schema
    const validatedData = imageGenerationSchema.parse(parsedData);

    // Map the validated data to Replicate's expected format
    const replicateInput = {
      prompt: validatedData.prompt,
      go_fast: true,
      guidance: validatedData.promptGuidance,
      megapixels: "1",
      num_outputs: validatedData.numOutputs,
      aspect_ratio: validatedData.aspectRatio,
      output_format: validatedData.outputFormat,
      output_quality: validatedData.outputQuality,
      prompt_strength: 0.8,
      num_inference_steps: validatedData.numInferenceSteps,
    };

    // Map form model to Replicate model name
    const replicateModel = validatedData.model === "flux-dev" 
      ? "black-forest-labs/flux-dev" 
      : "black-forest-labs/flux-schnell";

    // Run the image generation
    const output = await replicate.run(replicateModel, { 
      input: replicateInput 
    });

    // Handle the output - Replicate returns an array where each item has a .url() method
    let imageUrls: string[] = [];
    
    if (Array.isArray(output)) {
      // Extract URLs using the .url() method and convert to strings
      imageUrls = output.map((item) => {
        if (item && typeof item.url === 'function') {
          const url = item.url();
          // Convert URL object to string if needed
          const urlString = typeof url === 'string' ? url : url.toString();
          // Validate and potentially fix the URL
          return validateReplicateUrl(urlString);
        }
        return null;
      }).filter(Boolean) as string[];
    }

    // Log the Replicate URLs on server side
    console.log("Replicate URLs:", imageUrls);

    // Revalidate the dashboard page to show new images
    revalidatePath("/dashboard/gallery");

    return {
      success: true,
      data: imageUrls,
      message: "Image generated successfully",
    };
  } catch (error) {
    console.error("Error generating image:", error);
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

// Alternative function that accepts the validated form values directly
export async function generateImageFromValues(values: ImageGenerationFormValues) {
  try {
    // Get user ID for subscription validation
    const user = await currentUser();
    if (!user || !user.id) {
      throw new Error("Not authenticated");
    }
    const dbUserGen = await db.select().from(users).where(eq(users.clerkId, user.id));
    if (!dbUserGen[0]) {
      throw new Error("User not found in database");
    }
    const userIdGen = dbUserGen[0].id;

    // Import subscription validation middleware
    const { validateImageGeneration, incrementUsage } = await import('@/lib/middleware/subscription-validation');
    
    // Validate subscription and usage limits before generating image
    const validationResult = await validateImageGeneration();
    if (!validationResult.canProceed) {
      return {
        success: false,
        error: validationResult.reason || "Subscription validation failed",
        requiresUpgrade: true,
        currentPlan: validationResult.subscription?.plan,
        usage: validationResult.usage
      };
    }

    // Map the validated data to Replicate's expected format
    const replicateInput = {
      prompt: values.prompt,
      go_fast: true,
      guidance: values.promptGuidance,
      megapixels: "1",
      num_outputs: values.numOutputs,
      aspect_ratio: values.aspectRatio,
      output_format: values.outputFormat,
      output_quality: values.outputQuality,
      prompt_strength: 0.8,
      num_inference_steps: values.numInferenceSteps,
    };

    // Map form model to Replicate model name
    let replicateModel = "";
    if (values.model === "flux-dev") {
      replicateModel = "black-forest-labs/flux-dev";
    } else if (values.model === "flux-schnell") {
      replicateModel = "black-forest-labs/flux-schnell";
    } else {
      replicateModel = values.model; // Use the custom model string directly
      console.log("Custom model prompt:", values.prompt);
    }

    // Run the image generation
    const output = await replicate.run(replicateModel, { 
      input: replicateInput 
    });

    // Handle the output - Replicate returns an array where each item has a .url() method
    let imageUrls: string[] = [];
    
    if (Array.isArray(output)) {
      // Extract URLs using the .url() method and convert to strings
      imageUrls = output.map((item) => {
        if (item && typeof item.url === 'function') {
          const url = item.url();
          // Convert URL object to string if needed
          const urlString = typeof url === 'string' ? url : url.toString();
          // Validate and potentially fix the URL
          return validateReplicateUrl(urlString);
        }
        return null;
      }).filter(Boolean) as string[];
    }

    // Log the Replicate URLs on server side
    console.log("Replicate URLs:", imageUrls);

    // Use the already retrieved user data for storing images

    // Download and store images to R2 to avoid expiration issues
    const permanentUrls = await Promise.all(
      imageUrls.map(async (url, index) => {
        try {
          return await downloadAndStoreImage(url, userIdGen, `temp-${Date.now()}`, index);
        } catch (error) {
          console.error(`Failed to store image ${index} to R2:`, error);
          // Fallback to original Replicate URL if R2 storage fails
          return url;
        }
      })
    );

    console.log("Permanent URLs:", permanentUrls);

    // Store the generated image data in the database with permanent URLs
    const storeResult = await storeGeneratedImage({
      model: values.model,
      prompt: values.prompt,
      guidance: values.promptGuidance,
      numInferenceSteps: values.numInferenceSteps,
      outputFormat: values.outputFormat,
      aspectRatio: values.aspectRatio,
      imageUrls: permanentUrls,
    });

    if (!storeResult.success) {
      console.error("Failed to store image data:", storeResult.error);
      // Still return success for image generation, but log the storage error
    }

    // Increment usage counter after successful image generation
    try {
      await incrementUsage('generate_image');
    } catch (error) {
      console.error("Failed to increment usage:", error);
      // Don't fail the image generation if usage tracking fails
    }

    // Revalidate the dashboard page to show new images
    revalidatePath("/dashboard/gallery");

    return {
      success: true,
      data: permanentUrls,
      message: "Image generated successfully",
    };
  } catch (error) {
    console.error("Error generating image:", error);
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

export async function storeGeneratedImage({
  model,
  imageName,
  prompt,
  guidance,
  numInferenceSteps,
  outputFormat,
  width,
  height,
  aspectRatio,
  imageUrls,
}: {
  model: string;
  imageName?: string;
  prompt?: string;
  guidance?: number;
  numInferenceSteps?: number;
  outputFormat?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  imageUrls: string[];
}) {
  try {
    // Get the current Clerk user
    const user = await currentUser();
    if (!user || !user.id) {
      throw new Error("Not authenticated");
    }
    // Find the user's integer id in the users table
    const dbUserStore = await db.select().from(users).where(eq(users.clerkId, user.id));
    if (!dbUserStore[0]) {
      throw new Error("User not found in database");
    }
    const userIdStore = dbUserStore[0].id;

    // Insert into generatedImages
    const result = await db.insert(generatedImages).values({
      userId: userIdStore,
      model,
      imageName,
      prompt,
      guidance,
      numInferenceSteps,
      outputFormat,
      width,
      height,
      aspectRatio,
      imageUrls,
    }).returning();

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error storing generated image:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getUserImages() {
  try {
    // Get the current Clerk user
    const user = await currentUser();
    if (!user || !user.id) {
      throw new Error("Not authenticated");
    }

    // Find the user's integer id in the users table
    const dbUserImages = await db.select().from(users).where(eq(users.clerkId, user.id));
    if (!dbUserImages[0]) {
      throw new Error("User not found in database");
    }
    const userIdImages = dbUserImages[0].id;

    // Fetch all generated images for the user, ordered by creation date (newest first)
    const userImages = await db
      .select()
      .from(generatedImages)
      .where(eq(generatedImages.userId, userIdImages))
      .orderBy(desc(generatedImages.createdAt));

    // Check and fix expired URLs
    const fixedImages = await Promise.all(
      userImages.map(async (image) => {
        if (image.imageUrls && Array.isArray(image.imageUrls)) {
          const fixedUrls = await Promise.all(
            image.imageUrls.map(async (url, index) => {
              // Check if it's a Replicate URL that might be expired
              if (url.includes('replicate.delivery')) {
                try {
                  // Try to access the URL
                  const response = await fetch(url, { method: 'HEAD' });
                  if (response.ok) {
                    // URL is still valid, download and store it permanently
                    const permanentUrl = await downloadAndStoreImage(url, userIdImages, image.id.toString(), index);
                    
                    // Update the database with the permanent URL
                    await db
                      .update(generatedImages)
                      .set({
                        imageUrls: image.imageUrls.map((u, i) => i === index ? permanentUrl : u)
                      })
                      .where(eq(generatedImages.id, image.id));
                    
                    return permanentUrl;
                  } else {
                    // URL is expired, return a placeholder
                    return null;
                  }
                } catch (error) {
                  console.error('Error checking/fixing URL:', url, error);
                  return null;
                }
              }
              return url;
            })
          );
          
          return {
            ...image,
            imageUrls: fixedUrls.filter(Boolean)
          };
        }
        return image;
      })
    );

    return { 
      success: true, 
      data: fixedImages 
    };
  } catch (error) {
    console.error("Error fetching user images:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
