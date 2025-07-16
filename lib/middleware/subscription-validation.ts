import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/configs/db';
import { 
  userSubscriptions, 
  usageTracking, 
  users,
  subscriptionPlans
} from '@/configs/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
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
 * Create a free trial subscription for a new user
 */
async function createFreeTrialSubscription(dbUser: any) {
  // Get the free plan
  const freePlanResult = await db.select().from(subscriptionPlans)
    .where(eq(subscriptionPlans.name, 'free'))
    .limit(1);
  const freePlan = freePlanResult[0];
  
  if (!freePlan) {
    throw new Error('Free plan not found in database');
  }
  
  // Create free trial subscription
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  const newSubscriptionResult = await db.insert(userSubscriptions).values({
    userId: dbUser.id,
    planId: freePlan.id,
    status: 'trialing',
    currentPeriodStart: now,
    currentPeriodEnd: trialEnd,
    trialStart: now,
    trialEnd: trialEnd,
    createdAt: now,
    updatedAt: now
  }).returning();
  
  const newSubscription = newSubscriptionResult[0];
  
  // Create initial usage tracking
  await db.insert(usageTracking).values({
    userId: dbUser.id,
    subscriptionId: newSubscription.id,
    periodStart: now,
    periodEnd: trialEnd,
    imagesGeneratedCount: 0,
    modelsTrainedCount: 0,
    imageGenerationLimit: freePlan.imageGenerationLimit,
    modelTrainingLimit: freePlan.modelTrainingLimit,
    createdAt: now,
    updatedAt: now
  });
  
  return { subscription: newSubscription, plan: freePlan };
}

/**
 * Validate if user can generate images
 */
export async function validateImageGeneration(): Promise<SubscriptionValidationResult> {
  try {
    const user = await currentUser();
    
    if (!user || !user.id) {
      return {
        canProceed: false,
        reason: 'User not authenticated'
      };
    }

    // Get user from database
    const dbUserResult = await db.select().from(users).where(eq(users.clerkId, user.id));
    const dbUser = dbUserResult[0];

    if (!dbUser) {
      return {
        canProceed: false,
        reason: 'User not found'
      };
    }

    // Get current subscription
    let subscriptionResult = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.userId, dbUser.id))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);
    let subscription = subscriptionResult[0];

    if (!subscription) {
      // Auto-create free trial subscription for new users
      console.log('No subscription found, creating free trial subscription');
      const { subscription: newSubscription, plan: freePlan } = await createFreeTrialSubscription(dbUser);
      subscription = newSubscription;
      
      // Get usage for the newly created subscription
      const usageResult = await db.select().from(usageTracking)
        .where(eq(usageTracking.subscriptionId, subscription.id))
        .limit(1);
      const usage = usageResult[0];
      
      return {
        canProceed: true,
        subscription,
        usage,
        remainingImages: freePlan.imageGenerationLimit
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
    const usageResult = await db.select().from(usageTracking)
      .where(and(
        eq(usageTracking.userId, dbUser.id),
        eq(usageTracking.subscriptionId, subscription.id),
        gte(usageTracking.periodStart, billingPeriod.start),
        lte(usageTracking.periodEnd, billingPeriod.end)
      ))
      .limit(1);
    const usage = usageResult[0];

    if (!usage) {
      return {
        canProceed: false,
        reason: 'Usage tracking not found'
      };
    }

    // Get the subscription plan
    const planResult = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, subscription.planId));
    const plan = planResult[0];
    
    if (!plan) {
      return {
        canProceed: false,
        reason: 'Subscription plan not found'
      };
    }

    // Validate usage
    const validation = validateUsage(subscription, plan, usage, 'generate_image');

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
    const user = await currentUser();
    
    if (!user || !user.id) {
      return {
        canProceed: false,
        reason: 'User not authenticated'
      };
    }

    // Get user from database
    const dbUserResult = await db.select().from(users).where(eq(users.clerkId, user.id));
    const dbUser = dbUserResult[0];

    if (!dbUser) {
      return {
        canProceed: false,
        reason: 'User not found'
      };
    }

    // Get current subscription
    let subscriptionResult = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.userId, dbUser.id))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);
    let subscription = subscriptionResult[0];

    if (!subscription) {
      // Auto-create free trial subscription for new users
      console.log('No subscription found, creating free trial subscription');
      const { subscription: newSubscription, plan: freePlan } = await createFreeTrialSubscription(dbUser);
      subscription = newSubscription;
      
      // Get usage for the newly created subscription
      const usageResult = await db.select().from(usageTracking)
        .where(eq(usageTracking.subscriptionId, subscription.id))
        .limit(1);
      const usage = usageResult[0];
      
      return {
        canProceed: true,
        subscription,
        usage,
        remainingModels: freePlan.modelTrainingLimit
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
    const usageResult = await db.select().from(usageTracking)
      .where(and(
        eq(usageTracking.userId, dbUser.id),
        eq(usageTracking.subscriptionId, subscription.id),
        gte(usageTracking.periodStart, billingPeriod.start),
        lte(usageTracking.periodEnd, billingPeriod.end)
      ))
      .limit(1);
    const usage = usageResult[0];

    if (!usage) {
      return {
        canProceed: false,
        reason: 'Usage tracking not found'
      };
    }

    // Get the subscription plan
    const planResult = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, subscription.planId));
    const plan = planResult[0];
    
    if (!plan) {
      return {
        canProceed: false,
        reason: 'Subscription plan not found'
      };
    }

    // Validate usage
    const validation = validateUsage(subscription, plan, usage, 'train_model');

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
    const user = await currentUser();
    
    if (!user || !user.id) {
      return false;
    }

    // Get user from database
    const dbUserResult = await db.select().from(users).where(eq(users.clerkId, user.id));
    const dbUser = dbUserResult[0];

    if (!dbUser) {
      return false;
    }

    // Get current subscription
    const subscriptionResult = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.userId, dbUser.id))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);
    const subscription = subscriptionResult[0];

    if (!subscription) {
      return false;
    }

    // Get current billing period
    const billingPeriod = getCurrentBillingPeriod(subscription);

    // Get or create usage for current billing period
    let usageResult = await db.select().from(usageTracking)
      .where(and(
        eq(usageTracking.userId, dbUser.id),
        eq(usageTracking.subscriptionId, subscription.id),
        gte(usageTracking.periodStart, billingPeriod.start),
        lte(usageTracking.periodEnd, billingPeriod.end)
      ))
      .limit(1);
    let usage = usageResult[0];

    if (!usage) {
      // Create new usage record for current period
      const newUsage = await db.insert(usageTracking).values({
        userId: dbUser.id,
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