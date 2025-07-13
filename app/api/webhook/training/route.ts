import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { modelTraining, users } from "@/configs/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { currentUser } from "@clerk/nextjs/server";
import { EmailTemplate } from '@/components/email-template';
import { Resend } from 'resend';

// Your webhook secret from Replicate
const WEBHOOK_SECRET = process.env.REPLICATE_WEBHOOK_SECRET;
// Maximum age of webhook to accept (5 minutes)
const MAX_DIFF_IN_SECONDS = 5 * 60;
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
    try {
        // Check if webhook secret is configured
        if (!WEBHOOK_SECRET) {
            console.error("REPLICATE_WEBHOOK_SECRET environment variable is not set");
            return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
        }

        // Get webhook headers
        const webhookId = request.headers.get('webhook-id');
        const webhookTimestamp = request.headers.get('webhook-timestamp');
        const webhookSignatures = request.headers.get('webhook-signature');

        // Validate required headers
        if (!webhookId || !webhookTimestamp || !webhookSignatures) {
            console.error("Missing required webhook headers:", { webhookId, webhookTimestamp, webhookSignatures });
            return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
        }

        // Validate timestamp
        const timestamp = parseInt(webhookTimestamp);
        const now = Math.floor(Date.now() / 1000);
        const diff = Math.abs(now - timestamp);

        if (diff > MAX_DIFF_IN_SECONDS) {
            console.error(`Webhook timestamp is too old: ${diff} seconds`);
            return NextResponse.json({
                error: `Webhook timestamp is too old: ${diff} seconds`
            }, { status: 400 });
        }

        // Get raw request body as string
        const bodyText = await request.text();
        
        // Construct the signed content
        const signedContent = `${webhookId}.${webhookTimestamp}.${bodyText}`;
        console.log('Signed content length:', signedContent.length);
        console.log('Signed content preview:', signedContent.substring(0, 100) + '...');
        console.log('Webhook ID:', webhookId);
        console.log('Timestamp:', webhookTimestamp);

        // Use the webhook secret directly for HMAC computation
        console.log('Using webhook secret:', WEBHOOK_SECRET.substring(0, 10) + '...');

        const secretBytes = Buffer.from(WEBHOOK_SECRET.split('_')[1], "base64");

        // Calculate the HMAC signature
        const computedSignature = crypto
            .createHmac('sha256', secretBytes)
            .update(signedContent)
            .digest('base64');
        console.log('Computed signature:', computedSignature);

        // Parse the webhook signatures
        console.log('Raw webhook signatures header:', webhookSignatures);
        
        // Parse the webhook signatures according to official docs
        // Format: "v1,<signature>" or "v1 <signature>"
        const expectedSignatures = webhookSignatures
            .split(/[,\s]/)  // Split by comma or space
            .filter(sig => sig !== 'v1' && sig.length > 0)  // Remove 'v1' and empty strings
            .map(sig => sig.trim());  // Trim whitespace
        
        console.log('Parsed expected signatures:', expectedSignatures);

        // Use constant-time comparison to prevent timing attacks
        const isValid = expectedSignatures.length > 0 && expectedSignatures.some(expectedSig => {
            try {
                console.log('Comparing signatures:');
                console.log('  Expected:', expectedSig);
                console.log('  Computed:', computedSignature);
                console.log('  Expected length:', expectedSig.length);
                console.log('  Computed length:', computedSignature.length);
                
                return crypto.timingSafeEqual(
                    Buffer.from(expectedSig),
                    Buffer.from(computedSignature)
                );
            } catch (error) {
                console.error('Error comparing signatures:', error);
                return false;
            }
        });

        if (!isValid) {
            console.error("Invalid webhook signature");
            return NextResponse.json({ error: "Invalid webhook signature" }, { status: 403 });
        }

        // Parse and process the webhook
        const body = JSON.parse(bodyText);
        console.log(`Processing verified webhook for prediction: ${body.id}`);
        
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
                
                // Get user email from database using training record
                try {
                    if (trainingRecord.userId) {
                        const [userRecord] = await db
                            .select()
                            .from(users)
                            .where(eq(users.id, trainingRecord.userId));
                        
                        if (userRecord && userRecord.email) {
                            const userEmail = userRecord.email;
                            const userFullName = userRecord.fullName || userRecord.firstName || userEmail;
                            console.log(`Training completed for user: ${userEmail}`);
                            const { data, error } = await resend.emails.send({
                                from: 'Acme <onboarding@resend.dev>',
                                to: [userEmail],
                                subject: 'Model Training Completed',
                                react: EmailTemplate({ userFullName, message: "Your model has been trained successfully" }),
                            });
                        } else {
                            console.log('Could not get user email from database');
                        }
                    } else {
                        console.log('No userId found in training record');
                    }
                } catch (error) {
                    console.error('Error getting user email from database:', error);
                }
                
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
                
                // Send failure notification email
                try {
                    if (trainingRecord.userId) {
                        const [userRecord] = await db
                            .select()
                            .from(users)
                            .where(eq(users.id, trainingRecord.userId));
                        
                        if (userRecord && userRecord.email) {
                            const userEmail = userRecord.email;
                            const userFullName = userRecord.fullName || userRecord.firstName || userEmail;
                            console.log(`Training failed for user: ${userEmail}`);
                            const { data, error } = await resend.emails.send({
                                from: 'Acme <onboarding@resend.dev>',
                                to: [userEmail],
                                subject: 'Model Training Failed',
                                react: EmailTemplate({ userFullName, message: "Your model training has been cancelled" }),
                            });
                        } else {
                            console.log('Could not get user email from database');
                        }
                    } else {
                        console.log('No userId found in training record');
                    }
                } catch (error) {
                    console.error('Error getting user email from database:', error);
                }
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