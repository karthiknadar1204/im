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
        console.log(body.version)

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
                // Store version and modelId only when training starts
                if (replicateVersion) {
                    updateData.version = replicateVersion;
                }
                // The trainingJobId is actually the modelId
                updateData.modelId = trainingJobId;
                console.log(`Training ${trainingJobId} started with version: ${replicateVersion}`);
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