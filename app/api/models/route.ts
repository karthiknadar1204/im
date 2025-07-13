import { db } from "@/configs/db"
import { modelTraining, users } from "@/configs/schema"
import { currentUser } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

export async function GET(req: NextRequest, res: NextResponse) {
    try {
        const user = await currentUser()
        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const models = await db
            .select({
                id: modelTraining.id,
                modelName: modelTraining.modelName,
                gender: modelTraining.gender,
                status: modelTraining.status,
                trainingProgress: modelTraining.trainingProgress,
                createdAt: modelTraining.createdAt,
                completedAt: modelTraining.completedAt,
                modelId: modelTraining.modelId,
                version: modelTraining.version,
                errorMessage: modelTraining.errorMessage,
                trainingJobId: modelTraining.trainingJobId,
                trainingDataUrl: modelTraining.trainingDataUrl,
                updatedAt: modelTraining.updatedAt,
            })
            .from(modelTraining)
            .innerJoin(users, eq(modelTraining.userId, users.id))
            .where(eq(users.clerkId, user.id))
            .orderBy(modelTraining.createdAt)

        return NextResponse.json({ models })
    } catch (e: any) {
        console.error("Error in models", e)
        return NextResponse.json({ message: "Error in models", status: 500 }, { status: 500 })
    }
}