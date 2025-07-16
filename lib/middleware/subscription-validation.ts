import { auth } from '@clerk/nextjs';
import { db } from '@/configs/db';
import { 
  userSubscriptions, 
  usageTracking, 
  users 
} from '@/configs/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { 
  getCurrentBillingPeriod,
  validateUsage,
  isSubscriptionActive,
  isSubscriptionExpired
} from '@/lib/utils/subscription';

export interface SubscriptionValidationResult {
  canProceed: boolean;
  reason?: string;
  subscription?: any;
  usage?: any;
  remainingImages?: number | null;
  remainingModels?: number | null;
}

/**
 * Validate if user can generate images
 */
export async function validateImageGeneration(): Promise<SubscriptionValidationResult> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return {
        canProceed: false,
        reason: 'User not authenticated'
      };
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId)
    });

    if (!user) {
      return {
        canProceed: false,
        reason: 'User not found'
      };
    }

    // Get current subscription
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, user.id),
      orderBy: (userSubscriptions, { desc }) => [desc(userSubscriptions.createdAt)]
    });

    if (!subscription) {
      return {
        canProceed: false,
        reason: 'No subscription found'
      };
    }

    // Check if subscription is active
    if (!isSubscriptionActive(subscription)) {
      return {
        canProceed: false,
        reason: 'Subscription is not active',
        subscription
      };
    }

    // Check if subscription is expired
    if (isSubscriptionExpired(subscription)) {
      return {
        canProceed: false,
        reason: 'Subscription has expired',
        subscription
      };
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
      return {
        canProceed: false,
        reason: 'Usage tracking not found'
      };
    }

    // Validate usage
    const validation = validateUsage(subscription, subscription.plan!, usage, 'generate_image');

    if (!validation.canGenerateImage) {
      return {
        canProceed: false,
        reason: validation.reason || 'Image generation limit reached',
        subscription,
        usage,
        remainingImages: 0
      };
    }

    // Calculate remaining usage
    const remainingImages = usage.imageGenerationLimit 
      ? Math.max(0, usage.imageGenerationLimit - usage.imagesGeneratedCount)
      : null;

    return {
      canProceed: true,
      subscription,
      usage,
      remainingImages
    };

  } catch (error) {
    console.error('Error validating image generation:', error);
    return {
      canProceed: false,
      reason: 'Error validating subscription'
    };
  }
}

/**
 * Validate if user can train models
 */
export async function validateModelTraining(): Promise<SubscriptionValidationResult> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return {
        canProceed: false,
        reason: 'User not authenticated'
      };
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId)
    });

    if (!user) {
      return {
        canProceed: false,
        reason: 'User not found'
      };
    }

    // Get current subscription
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, user.id),
      orderBy: (userSubscriptions, { desc }) => [desc(userSubscriptions.createdAt)]
    });

    if (!subscription) {
      return {
        canProceed: false,
        reason: 'No subscription found'
      };
    }

    // Check if subscription is active
    if (!isSubscriptionActive(subscription)) {
      return {
        canProceed: false,
        reason: 'Subscription is not active',
        subscription
      };
    }

    // Check if subscription is expired
    if (isSubscriptionExpired(subscription)) {
      return {
        canProceed: false,
        reason: 'Subscription has expired',
        subscription
      };
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
      return {
        canProceed: false,
        reason: 'Usage tracking not found'
      };
    }

    // Validate usage
    const validation = validateUsage(subscription, subscription.plan!, usage, 'train_model');

    if (!validation.canTrainModel) {
      return {
        canProceed: false,
        reason: validation.reason || 'Model training limit reached',
        subscription,
        usage,
        remainingModels: 0
      };
    }

    // Calculate remaining usage
    const remainingModels = usage.modelTrainingLimit 
      ? Math.max(0, usage.modelTrainingLimit - usage.modelsTrainedCount)
      : null;

    return {
      canProceed: true,
      subscription,
      usage,
      remainingModels
    };

  } catch (error) {
    console.error('Error validating model training:', error);
    return {
      canProceed: false,
      reason: 'Error validating subscription'
    };
  }
}

/**
 * Increment usage after successful operation
 */
export async function incrementUsage(action: 'generate_image' | 'train_model'): Promise<boolean> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return false;
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId)
    });

    if (!user) {
      return false;
    }

    // Get current subscription
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, user.id),
      orderBy: (userSubscriptions, { desc }) => [desc(userSubscriptions.createdAt)]
    });

    if (!subscription) {
      return false;
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
        imageGenerationLimit: null,
        modelTrainingLimit: null,
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
    await db.update(usageTracking)
      .set(updateData)
      .where(eq(usageTracking.id, usage.id));

    return true;

  } catch (error) {
    console.error('Error incrementing usage:', error);
    return false;
  }
} 