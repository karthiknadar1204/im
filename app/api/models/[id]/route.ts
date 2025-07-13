import { db } from "@/configs/db"
import { modelTraining, users } from "@/configs/schema"
import { currentUser } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await currentUser()
        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const modelId = parseInt(id)
        if (isNaN(modelId)) {
            return NextResponse.json({ message: "Invalid model ID" }, { status: 400 })
        }

        // Get the model record to check ownership and get Replicate info
        const [model] = await db
            .select({
                id: modelTraining.id,
                modelId: modelTraining.modelId,
                version: modelTraining.version,
                userId: modelTraining.userId,
            })
            .from(modelTraining)
            .innerJoin(users, eq(modelTraining.userId, users.id))
            .where(
                and(
                    eq(modelTraining.id, modelId),
                    eq(users.clerkId, user.id)
                )
            )

        if (!model) {
            return NextResponse.json({ message: "Model not found" }, { status: 404 })
        }

        console.log('Model record found:', {
            id: model.id,
            modelId: model.modelId,
            version: model.version,
            userId: model.userId
        })

        // Only attempt Replicate deletion if we have both modelId and version AND they appear to be valid
        if (model.modelId && model.version) {
            try {
                const replicateApiKey = process.env.REPLICATE_API_TOKEN
                if (!replicateApiKey) {
                    console.error("REPLICATE_API_TOKEN not found in environment variables")
                    return NextResponse.json(
                        { message: "Server configuration error" },
                        { status: 500 }
                    )
                }

                // Check if this is a training job ID (which we shouldn't delete) or actual model ID
                // Training job IDs are typically long alphanumeric strings like 'xaffag0wtxrm80cr0ejvsy8g0m'
                const isTrainingJobId = model.modelId.length > 20 && /^[a-zA-Z0-9]+$/.test(model.modelId);
                
                // Only skip if it's a training job ID - final model versions are also long hex strings
                // but they're valid for deletion
                if (isTrainingJobId) {
                    console.log(`Skipping Replicate deletion:`)
                    console.log(`- ModelId: ${model.modelId} (appears to be training job ID)`)
                    console.log(`- Version: ${model.version}`)
                    console.log('This appears to be training metadata, not a final trained model')
                } else {
                    console.log(`Attempting to delete model from Replicate: ${model.modelId}:${model.version}`)
                    
                    // First, try to delete the specific version
                    const versionDeleteResponse = await fetch(
                        `https://api.replicate.com/v1/models/karthiknadar1204/${model.modelId}/versions/${model.version}`,
                        {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Token ${replicateApiKey}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    )

                    console.log(`Version deletion response status: ${versionDeleteResponse.status}`)
                    
                    if (!versionDeleteResponse.ok) {
                        const errorText = await versionDeleteResponse.text()
                        console.error('Failed to delete model version from Replicate:', errorText)
                    } else {
                        console.log(`Successfully deleted model version ${model.version} from Replicate`)
                    }
                    
                    // Also try to delete the entire model (this should remove all versions)
                    const modelDeleteResponse = await fetch(
                        `https://api.replicate.com/v1/models/karthiknadar1204/${model.modelId}`,
                        {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Token ${replicateApiKey}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    )

                    console.log(`Model deletion response status: ${modelDeleteResponse.status}`)
                    
                    if (!modelDeleteResponse.ok) {
                        const errorText = await modelDeleteResponse.text()
                        console.error('Failed to delete entire model from Replicate:', errorText)
                        // Continue with database deletion even if Replicate deletion fails
                    } else {
                        console.log(`Successfully deleted entire model ${model.modelId} from Replicate`)
                    }
                }
            } catch (replicateError) {
                console.error('Error deleting from Replicate:', replicateError)
                // Continue with database deletion even if Replicate deletion fails
            }
        } else {
            console.log('No modelId or version found, skipping Replicate deletion')
        }

        // Delete from database
        await db
            .delete(modelTraining)
            .where(eq(modelTraining.id, modelId))

        return NextResponse.json({ 
            message: "Model deleted successfully",
            modelId: model.modelId,
            version: model.version
        })

    } catch (error) {
        console.error("Error deleting model:", error)
        return NextResponse.json(
            { message: "Error deleting model" },
            { status: 500 }
        )
    }
} 