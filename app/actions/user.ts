'use server'

import { db } from "@/configs/db"
import { users } from "@/configs/schema"
import { eq } from "drizzle-orm"

export async function createUser(name: string, email: string, image: string, clerkId: string) {
    try {
        if (!name || !email || !image || !clerkId) {
            throw new Error('Missing required fields')
        }
        

        const existingUser = await db.select().from(users).where(eq(users.email, email))
        
        if (existingUser.length > 0) {
            return { message: 'User already exists', status: 400 }
        }
        

        const result = await db.insert(users).values({
            name,
            email,
            image,
            clerkId
        }).returning()
        
        return { message: 'User created successfully', result, status: 201 }
    }
    catch (error) {
        console.log('Error creating user:', error)
        return { message: 'Error creating user', status: 500 }
    }
}