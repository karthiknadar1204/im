"use server";

import Replicate from "replicate";
import { imageGenerationSchema, type ImageGenerationFormValues } from "@/lib/schemas/image-generation";
import { revalidatePath } from "next/cache";
import { db } from "@/configs/db";
import { generatedImages, users } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

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
          return typeof url === 'string' ? url : url.toString();
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
    const replicateModel = values.model === "flux-dev" 
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
          return typeof url === 'string' ? url : url.toString();
        }
        return null;
      }).filter(Boolean) as string[];
    }

    // Log the Replicate URLs on server side
    console.log("Replicate URLs:", imageUrls);

    // Store the generated image data in the database
    const storeResult = await storeGeneratedImage({
      model: values.model,
      prompt: values.prompt,
      guidance: values.promptGuidance,
      numInferenceSteps: values.numInferenceSteps,
      outputFormat: values.outputFormat,
      aspectRatio: values.aspectRatio,
      imageUrls: imageUrls,
    });

    if (!storeResult.success) {
      console.error("Failed to store image data:", storeResult.error);
      // Still return success for image generation, but log the storage error
    }

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
    const dbUser = await db.select().from(users).where(eq(users.clerkId, user.id));
    if (!dbUser[0]) {
      throw new Error("User not found in database");
    }
    const userId = dbUser[0].id;

    // Insert into generatedImages
    const result = await db.insert(generatedImages).values({
      userId,
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
