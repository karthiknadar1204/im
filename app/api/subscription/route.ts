import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/configs/db';
import { 
  userSubscriptions, 
  subscriptionPlans, 
  usageTracking, 
  users 
} from '@/configs/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { 
  getCurrentBillingPeriod,
  calculateUsageLimits,
  validateUsage,
  isSubscriptionActive,
  isSubscriptionExpired
} from '@/lib/utils/subscription';

// GET /api/subscription - Get current user's subscription status and usage
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
      with: {
        plan: true
      },
      orderBy: (userSubscriptions, { desc }) => [desc(userSubscriptions.createdAt)]
    });

    // If no subscription, create free tier subscription
    if (!subscription) {
      const freePlan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.name, 'free')
      });

      if (!freePlan) {
        return NextResponse.json(
          { error: 'Free plan not found' },
          { status: 500 }
      );
      }

      // Create free tier subscription (trial for first month)
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const newSubscription = await db.insert(userSubscriptions).values({
        userId: user.id,
        planId: freePlan.id,
        status: 'trialing',
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        trialStart: now,
        trialEnd: trialEnd,
        createdAt: now,
        updatedAt: now
      }).returning();

      // Get the created subscription with plan details
      const createdSubscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.id, newSubscription[0].id),
        with: {
          plan: true
        }
      });

      // Initialize usage tracking for free tier
      await db.insert(usageTracking).values({
        userId: user.id,
        subscriptionId: newSubscription[0].id,
        periodStart: now,
        periodEnd: trialEnd,
        imagesGeneratedCount: 0,
        modelsTrainedCount: 0,
        imageGenerationLimit: freePlan.imageGenerationLimit,
        modelTrainingLimit: freePlan.modelTrainingLimit,
        createdAt: now,
        updatedAt: now
      });

      return NextResponse.json({
        subscription: createdSubscription,
        usage: {
          imagesGeneratedCount: 0,
          modelsTrainedCount: 0,
          imageGenerationLimit: freePlan.imageGenerationLimit,
          modelTrainingLimit: freePlan.modelTrainingLimit
        },
        canGenerateImage: true,
        canTrainModel: true,
        remainingImages: freePlan.imageGenerationLimit,
        remainingModels: freePlan.modelTrainingLimit,
        isFreeTier: true,
        trialDaysRemaining: 30
      });
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

    // If no usage record for current period, create one
    let currentUsage = usage;
    if (!usage) {
      const newUsage = await db.insert(usageTracking).values({
        userId: user.id,
        subscriptionId: subscription.id,
        periodStart: billingPeriod.start,
        periodEnd: billingPeriod.end,
        imagesGeneratedCount: 0,
        modelsTrainedCount: 0,
        imageGenerationLimit: subscription.plan?.imageGenerationLimit || null,
        modelTrainingLimit: subscription.plan?.modelTrainingLimit || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      currentUsage = newUsage[0];
    }

    // Calculate usage limits
    const limits = calculateUsageLimits(subscription, subscription.plan!, currentUsage);

    // Validate current usage
    const imageValidation = validateUsage(subscription, subscription.plan!, currentUsage, 'generate_image');
    const modelValidation = validateUsage(subscription, subscription.plan!, currentUsage, 'train_model');

    const response = {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialStart: subscription.trialStart,
        trialEnd: subscription.trialEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        plan: {
          id: subscription.plan?.id,
          name: subscription.plan?.name,
          displayName: subscription.plan?.displayName,
          price: subscription.plan?.price,
          currency: subscription.plan?.currency,
          imageGenerationLimit: subscription.plan?.imageGenerationLimit,
          modelTrainingLimit: subscription.plan?.modelTrainingLimit,
          features: subscription.plan?.features
        }
      },
      usage: {
        imagesGeneratedCount: currentUsage.imagesGeneratedCount,
        modelsTrainedCount: currentUsage.modelsTrainedCount,
        imageGenerationLimit: currentUsage.imageGenerationLimit,
        modelTrainingLimit: currentUsage.modelTrainingLimit,
        periodStart: currentUsage.periodStart,
        periodEnd: currentUsage.periodEnd
      },
      canGenerateImage: imageValidation.canGenerateImage,
      canTrainModel: modelValidation.canTrainModel,
      remainingImages: limits.remainingImages,
      remainingModels: limits.remainingModels,
      isActive: isSubscriptionActive(subscription),
      isExpired: isSubscriptionExpired(subscription),
      isFreeTier: subscription.plan?.name === 'free',
      billingPeriodDaysRemaining: Math.ceil((subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting subscription:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    );
  }
}

// POST /api/subscription - Create a new subscription
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
    const { planName, paymentMethodId } = body;

    if (!planName || !['pro', 'enterprise'].includes(planName)) {
      return NextResponse.json(
        { error: 'Invalid plan name. Must be "pro" or "enterprise"' },
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

    // Check if user already has an active subscription
    const existingSubscription = await db.query.userSubscriptions.findFirst({
      where: and(
        eq(userSubscriptions.userId, user.id),
        eq(userSubscriptions.status, 'active')
      )
    });

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 400 }
      );
    }

    // Import Dodo functions
    const { createUserSubscription } = await import('@/lib/utils/dodo-payments');

    // Create subscription in Dodo and our database
    const result = await createUserSubscription(user.id, planName, paymentMethodId);

    return NextResponse.json({
      message: 'Subscription created successfully',
      subscription: result.subscription,
      customer: result.customer
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
} 