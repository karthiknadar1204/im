import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { modelTraining, users } from "@/configs/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { currentUser } from "@clerk/nextjs/server";
import { EmailTemplate } from '@/components/email-template';
import { Resend } from 'resend';


const WEBHOOK_SECRET = process.env.REPLICATE_WEBHOOK_SECRET;
// Maximum age of webhook to accept (5 minutes)
const MAX_DIFF_IN_SECONDS = 5 * 60;
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
    try {

        if (!WEBHOOK_SECRET) {
            console.error("REPLICATE_WEBHOOK_SECRET environment variable is not set");
            return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
        }


        const webhookId = request.headers.get('webhook-id');
        const webhookTimestamp = request.headers.get('webhook-timestamp');
        const webhookSignatures = request.headers.get('webhook-signature');


        if (!webhookId || !webhookTimestamp || !webhookSignatures) {
            console.error("Missing required webhook headers:", { webhookId, webhookTimestamp, webhookSignatures });
            return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
        }


        const timestamp = parseInt(webhookTimestamp);
        const now = Math.floor(Date.now() / 1000);
        const diff = Math.abs(now - timestamp);

        if (diff > MAX_DIFF_IN_SECONDS) {
            console.error(`Webhook timestamp is too old: ${diff} seconds`);
            return NextResponse.json({
                error: `Webhook timestamp is too old: ${diff} seconds`
            }, { status: 400 });
        }


        const bodyText = await request.text();
        

        const signedContent = `${webhookId}.${webhookTimestamp}.${bodyText}`;
        console.log('Signed content length:', signedContent.length);
        console.log('Signed content preview:', signedContent.substring(0, 100) + '...');
        console.log('Webhook ID:', webhookId);
        console.log('Timestamp:', webhookTimestamp);


        console.log('Using webhook secret:', WEBHOOK_SECRET.substring(0, 10) + '...');

        const secretBytes = Buffer.from(WEBHOOK_SECRET.split('_')[1], "base64");


        const computedSignature = crypto
            .createHmac('sha256', secretBytes)
            .update(signedContent)
            .digest('base64');
        console.log('Computed signature:', computedSignature);


        console.log('Raw webhook signatures header:', webhookSignatures);
        
        const expectedSignatures = webhookSignatures
            .split(/[,\s]/)  
            .filter(sig => sig !== 'v1' && sig.length > 0)  
            .map(sig => sig.trim()); 
        
        console.log('Parsed expected signatures:', expectedSignatures);


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
        

        if (body.output) {
            console.log("Full output structure:", JSON.stringify(body.output, null, 2));
        }
        console.log(body.version)
        console.log(request.nextUrl.searchParams.get("userId"))
        console.log(request.nextUrl.searchParams.get("modelId"))
        console.log(request.nextUrl.searchParams.get("fileName"))


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


        const updateData: any = {
            status: status,
            updatedAt: new Date(),
        };


        switch (status) {
            case 'starting':
                updateData.status = 'training';
                updateData.trainingProgress = 5;
                updateData.modelId = trainingJobId;
                console.log(`Training ${trainingJobId} started`);
                break;

            case 'processing':
                updateData.status = 'training';

                if (metrics && metrics.step) {
                    const totalSteps = trainingRecord.input?.steps || 1000;
                    const currentStep = metrics.step;
                    updateData.trainingProgress = Math.min(Math.round((currentStep / totalSteps) * 100), 95);
                } else {
                    updateData.trainingProgress = 50;
                }
                console.log(`Training ${trainingJobId} is in progress... Progress: ${updateData.trainingProgress}%`);
                break;

            case 'succeeded':
                updateData.status = 'completed';
                updateData.trainingProgress = 100;
                updateData.completedAt = completed_at ? new Date(completed_at) : new Date();
                

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
            
                if (output) {
                    console.log('Training output:', output);
                    
                    if (output && typeof output === 'object' && output.version) {
                        const versionString = output.version;
                        console.log('Version string from output:', versionString);
                        
                        if (versionString.includes(':')) {
                            const [modelRef, finalVersion] = versionString.split(':');
                            const modelParts = modelRef.split('/');
                            const finalModelId = modelParts[modelParts.length - 1]; 
                            
                            updateData.modelId = finalModelId;
                            updateData.version = finalVersion;
                            console.log(`Training completed! Final model: ${finalModelId}:${finalVersion}`);
                            console.log(`Full model reference: ${versionString}`);
                        }
                    } else if (typeof output === 'string' && output.includes('replicate.com')) {

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
                updateData.status = status;
                console.log(`Training ${trainingJobId} status: ${status}`);
                break;
        }

        const [updatedRecord] = await db
            .update(modelTraining)
            .set(updateData)
            .where(eq(modelTraining.trainingJobId, trainingJobId))
            .returning();

        console.log(`Updated training record for job ${trainingJobId}:`, {
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