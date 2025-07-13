import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { modelTraining } from "@/configs/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log("webhook received", body);

        // Extract relevant data from the webhook payload
        const {
            id: trainingJobId,
            status,
            completed_at,
            error,
            output,
            logs
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

        // Handle different statuses
        switch (status) {
            case 'processing':
                updateData.status = 'training';
                updateData.trainingProgress = 50; // Mid-point during training
                break;

            case 'succeeded':
                updateData.status = 'completed';
                updateData.trainingProgress = 100;
                updateData.completedAt = completed_at ? new Date(completed_at) : new Date();
                // If there's output data, you might want to store it
                if (output) {
                    console.log("Training completed successfully with output:", output);
                }
                break;

            case 'failed':
                updateData.status = 'failed';
                updateData.errorMessage = error || logs || 'Training failed';
                updateData.completedAt = new Date();
                break;

            case 'canceled':
                updateData.status = 'failed';
                updateData.errorMessage = 'Training was canceled';
                updateData.completedAt = new Date();
                break;

            default:
                // For other statuses like 'starting', 'pending', etc.
                updateData.status = status;
                break;
        }

        // Update the database record
        const [updatedRecord] = await db
            .update(modelTraining)
            .set(updateData)
            .where(eq(modelTraining.trainingJobId, trainingJobId))
            .returning();

        console.log(`Updated training record for job ${trainingJobId} with status: ${status}`);

        return NextResponse.json({
            message: "Webhook processed successfully",
            status: 200,
            trainingJobId,
            updatedStatus: status
        });

    } catch (error) {
        console.error("Error in webhook", error);
        return NextResponse.json(
            { message: "Error in webhook", status: 500 },
            { status: 500 }
        );
    }
}