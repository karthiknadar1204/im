import { db } from "@/configs/db"
import { modelTraining, users } from "@/configs/schema"
import { currentUser } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await currentUser()
        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const modelId = parseInt(params.id)
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

        // If the model has been trained and has modelId and version, delete from Replicate
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

                const replicateResponse = await fetch(
                    `https://api.replicate.com/v1/models/karthiknadar1204/${model.modelId}/versions/${model.version}`,
                    {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Token ${replicateApiKey}`,
                            'Content-Type': 'application/json',
                        },
                    }
                )

                if (!replicateResponse.ok) {
                    console.error('Failed to delete model from Replicate:', await replicateResponse.text())
                    // Continue with database deletion even if Replicate deletion fails
                } else {
                    console.log(`Successfully deleted model ${model.modelId} version ${model.version} from Replicate`)
                }
            } catch (replicateError) {
                console.error('Error deleting from Replicate:', replicateError)
                // Continue with database deletion even if Replicate deletion fails
            }
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