import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { modelTraining } from "@/configs/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log("webhook received", body);
        console.log("Extracted data:", {
            trainingJobId: body.id,
            status: body.status,
            output: body.output,
            replicateVersion: body.version,
            error: body.error
        });
        
        // Log the full output structure for debugging
        if (body.output) {
            console.log("Full output structure:", JSON.stringify(body.output, null, 2));
        }
        console.log(body.version)
        console.log(request.nextUrl.searchParams.get("userId"))
        console.log(request.nextUrl.searchParams.get("modelId"))
        console.log(request.nextUrl.searchParams.get("fileName"))

        // Extract relevant data from the webhook payload
        const {
            id: trainingJobId,
            status,
            completed_at,
            error,
            output,
            logs,
            metrics,
            version: replicateVersion
        } = body;

        // Find the training record by trainingJobId
        const [trainingRecord] = await db
            .select()
            .from(modelTraining)
            .where(eq(modelTraining.trainingJobId, trainingJobId));

        if (!trainingRecord) {
            console.error(`Training record not found for job ID: ${trainingJobId}`);
            return NextResponse.json(
                { message: "Training record not found" },
                { status: 404 }
            );
        }

        // Prepare update data based on status
        const updateData: any = {
            status: status,
            updatedAt: new Date(),
        };

        // Handle the three main states
        switch (status) {
            case 'starting':
                updateData.status = 'training';
                updateData.trainingProgress = 5; // Starting progress
                // Don't store the training model version - we'll get the final version when training completes
                // Store the trainingJobId temporarily, but we'll update it with the final modelId when training completes
                updateData.modelId = trainingJobId;
                console.log(`Training ${trainingJobId} started`);
                break;

            case 'processing':
                updateData.status = 'training';
                // Calculate progress based on metrics if available
                if (metrics && metrics.step) {
                    const totalSteps = trainingRecord.input?.steps || 1000;
                    const currentStep = metrics.step;
                    updateData.trainingProgress = Math.min(Math.round((currentStep / totalSteps) * 100), 95);
                } else {
                    updateData.trainingProgress = 50; // Default mid-point
                }
                console.log(`Training ${trainingJobId} is in progress... Progress: ${updateData.trainingProgress}%`);
                break;

            case 'succeeded':
                updateData.status = 'completed';
                updateData.trainingProgress = 100;
                updateData.completedAt = completed_at ? new Date(completed_at) : new Date();
                
                // Extract the final trained model information from output
                if (output) {
                    console.log('Training output:', output);
                    
                    if (output && typeof output === 'object' && output.version) {
                        // The output.version contains the full model reference: "owner/model:version"
                        const versionString = output.version;
                        console.log('Version string from output:', versionString);
                        
                        // Parse the version string: "karthiknadar1204/model_1_vffddb_20250713:043b56fe34c8ee70a22e11e7874dbb9e6785e9880841a7e99fd0a5bbf59ee883"
                        if (versionString.includes(':')) {
                            const [modelRef, finalVersion] = versionString.split(':');
                            const modelParts = modelRef.split('/');
                            const finalModelId = modelParts[modelParts.length - 1]; // Get the last part as modelId
                            
                            updateData.modelId = finalModelId;
                            updateData.version = finalVersion;
                            console.log(`Training completed! Final model: ${finalModelId}:${finalVersion}`);
                            console.log(`Full model reference: ${versionString}`);
                        }
                    } else if (typeof output === 'string' && output.includes('replicate.com')) {
                        // Fallback: If output is a URL, extract model info from it
                        const urlParts = output.split('/');
                        const modelOwner = urlParts[urlParts.length - 3];
                        const finalModelId = urlParts[urlParts.length - 2];
                        const finalVersion = urlParts[urlParts.length - 1];
                        
                        updateData.modelId = finalModelId;
                        updateData.version = finalVersion;
                        console.log(`Training completed! Final model: ${modelOwner}/${finalModelId}:${finalVersion}`);
                    }
                }
                
                console.log(`Training ${trainingJobId} completed successfully!`);
                break;

            case 'failed':
            case 'canceled':
                updateData.status = 'failed';
                updateData.trainingProgress = 0;
                updateData.errorMessage = error || logs || 'Training failed';
                updateData.completedAt = new Date();
                console.error(`Training ${trainingJobId} failed:`, updateData.errorMessage);
                break;

            default:
                // For any other statuses, keep as is
                updateData.status = status;
                console.log(`Training ${trainingJobId} status: ${status}`);
                break;
        }

        // Update the database record
        const [updatedRecord] = await db
            .update(modelTraining)
            .set(updateData)
            .where(eq(modelTraining.trainingJobId, trainingJobId))
            .returning();

        console.log(`✅ Updated training record for job ${trainingJobId}:`, {
            status: updateData.status,
            progress: updateData.trainingProgress,
            completedAt: updateData.completedAt,
            errorMessage: updateData.errorMessage,
            modelId: updateData.modelId,
            version: updateData.version,
        });

        return NextResponse.json({
            message: "Webhook processed successfully",
            status: 200,
            trainingJobId,
            updatedStatus: updateData.status,
            progress: updateData.trainingProgress
        });

    } catch (error) {
        console.error("Error in webhook", error);
        return NextResponse.json(
            { message: "Error in webhook", status: 500 },
            { status: 500 }
        );
    }
}