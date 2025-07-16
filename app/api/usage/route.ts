import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/configs/db';
import { 
  usageTracking, 
  userSubscriptions, 
  users 
} from '@/configs/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { getCurrentBillingPeriod } from '@/lib/utils/subscription';

// GET /api/usage - Get current usage statistics
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId)
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get current subscription
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, user.id),
      orderBy: (userSubscriptions, { desc }) => [desc(userSubscriptions.createdAt)]
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Get current billing period
    const billingPeriod = getCurrentBillingPeriod(subscription);

    // Get usage for current billing period
    const usage = await db.query.usageTracking.findFirst({
      where: and(
        eq(usageTracking.userId, user.id),
        eq(usageTracking.subscriptionId, subscription.id),
        gte(usageTracking.periodStart, billingPeriod.start),
        lte(usageTracking.periodEnd, billingPeriod.end)
      )
    });

    if (!usage) {
      return NextResponse.json(
        { error: 'Usage tracking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      usage: {
        imagesGeneratedCount: usage.imagesGeneratedCount,
        modelsTrainedCount: usage.modelsTrainedCount,
        imageGenerationLimit: usage.imageGenerationLimit,
        modelTrainingLimit: usage.modelTrainingLimit,
        periodStart: usage.periodStart,
        periodEnd: usage.periodEnd
      },
      remainingImages: usage.imageGenerationLimit 
        ? Math.max(0, usage.imageGenerationLimit - usage.imagesGeneratedCount)
        : null,
      remainingModels: usage.modelTrainingLimit
        ? Math.max(0, usage.modelTrainingLimit - usage.modelsTrainedCount)
        : null
    });

  } catch (error) {
    console.error('Error getting usage:', error);
    return NextResponse.json(
      { error: 'Failed to get usage' },
      { status: 500 }
    );
  }
}

// POST /api/usage/increment - Increment usage counters (internal use)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body; // 'generate_image' or 'train_model'

    if (!action || !['generate_image', 'train_model'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "generate_image" or "train_model"' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId)
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get current subscription
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, user.id),
      orderBy: (userSubscriptions, { desc }) => [desc(userSubscriptions.createdAt)]
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Get current billing period
    const billingPeriod = getCurrentBillingPeriod(subscription);

    // Get or create usage for current billing period
    let usage = await db.query.usageTracking.findFirst({
      where: and(
        eq(usageTracking.userId, user.id),
        eq(usageTracking.subscriptionId, subscription.id),
        gte(usageTracking.periodStart, billingPeriod.start),
        lte(usageTracking.periodEnd, billingPeriod.end)
      )
    });

    if (!usage) {
      // Create new usage record for current period
      const newUsage = await db.insert(usageTracking).values({
        userId: user.id,
        subscriptionId: subscription.id,
        periodStart: billingPeriod.start,
        periodEnd: billingPeriod.end,
        imagesGeneratedCount: 0,
        modelsTrainedCount: 0,
        imageGenerationLimit: null, // Will be set based on plan
        modelTrainingLimit: null, // Will be set based on plan
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      usage = newUsage[0];
    }

    // Increment the appropriate counter
    const updateData: any = {
      updatedAt: new Date()
    };

    if (action === 'generate_image') {
      updateData.imagesGeneratedCount = usage.imagesGeneratedCount + 1;
    } else if (action === 'train_model') {
      updateData.modelsTrainedCount = usage.modelsTrainedCount + 1;
    }

    // Update usage record
    const updatedUsage = await db.update(usageTracking)
      .set(updateData)
      .where(eq(usageTracking.id, usage.id))
      .returning();

    return NextResponse.json({
      message: `${action} usage incremented successfully`,
      usage: updatedUsage[0]
    });

  } catch (error) {
    console.error('Error incrementing usage:', error);
    return NextResponse.json(
      { error: 'Failed to increment usage' },
      { status: 500 }
    );
  }
} 