import { addMonths, startOfMonth, endOfMonth, isAfter, isBefore, isWithinInterval } from 'date-fns';
import { usageTracking } from '@/configs/schema';
import type { 
  SubscriptionPlan, 
  UserSubscription, 
  UsageTracking, 
  UsageLimits, 
  UsageValidation,
  BillingPeriod,
  SubscriptionStatus 
} from '../types/payment';

/**
 * Get the current billing period for a subscription
 */
export function getCurrentBillingPeriod(subscription: UserSubscription): BillingPeriod {
  const now = new Date();
  const start = new Date(subscription.currentPeriodStart);
  const end = new Date(subscription.currentPeriodEnd);
  
  return {
    start,
    end,
    isCurrent: isWithinInterval(now, { start, end })
  };
}

/**
 * Get the next billing period
 */
export function getNextBillingPeriod(subscription: UserSubscription): BillingPeriod {
  const currentEnd = new Date(subscription.currentPeriodEnd);
  const nextStart = currentEnd;
  const nextEnd = addMonths(nextStart, 1);
  
  return {
    start: nextStart,
    end: nextEnd,
    isCurrent: false
  };
}

/**
 * Check if a subscription is active
 */
export function isSubscriptionActive(subscription: UserSubscription): boolean {
  const activeStatuses: SubscriptionStatus[] = ['active', 'trialing'];
  return activeStatuses.includes(subscription.status);
}

/**
 * Check if a subscription is in trial period
 */
export function isInTrialPeriod(subscription: UserSubscription): boolean {
  if (!subscription.trialStart || !subscription.trialEnd) return false;
  
  const now = new Date();
  const trialStart = new Date(subscription.trialStart);
  const trialEnd = new Date(subscription.trialEnd);
  
  return isWithinInterval(now, { start: trialStart, end: trialEnd });
}

/**
 * Check if a subscription is expired
 */
export function isSubscriptionExpired(subscription: UserSubscription): boolean {
  const now = new Date();
  const periodEnd = new Date(subscription.currentPeriodEnd);
  
  return isAfter(now, periodEnd);
}

/**
 * Calculate usage limits for a user
 */
export function calculateUsageLimits(
  subscription: UserSubscription,
  plan: SubscriptionPlan,
  usage: UsageTracking
): UsageLimits {
  const imageGenerationLimit = plan.imageGenerationLimit;
  const modelTrainingLimit = plan.modelTrainingLimit;
  const currentImageUsage = usage.imagesGeneratedCount;
  const currentModelUsage = usage.modelsTrainedCount;
  
  const remainingImages = imageGenerationLimit !== null 
    ? Math.max(0, imageGenerationLimit - currentImageUsage)
    : null;
    
  const remainingModels = modelTrainingLimit !== null
    ? Math.max(0, modelTrainingLimit - currentModelUsage)
    : null;
  
  return {
    imageGenerationLimit,
    modelTrainingLimit,
    currentImageUsage,
    currentModelUsage,
    remainingImages,
    remainingModels
  };
}

/**
 * Validate if user can perform an action
 */
export function validateUsage(
  subscription: UserSubscription,
  plan: SubscriptionPlan,
  usage: UsageTracking,
  action: 'generate_image' | 'train_model'
): UsageValidation {
  // Check if subscription is active
  if (!isSubscriptionActive(subscription)) {
    return {
      canGenerateImage: false,
      canTrainModel: false,
      reason: 'Subscription is not active'
    };
  }
  
  // Check if subscription is expired
  if (isSubscriptionExpired(subscription)) {
    return {
      canGenerateImage: false,
      canTrainModel: false,
      reason: 'Subscription has expired'
    };
  }
  
  const limits = calculateUsageLimits(subscription, plan, usage);
  
  if (action === 'generate_image') {
    const canGenerate = limits.imageGenerationLimit === null || 
                       limits.remainingImages! > 0;
    
    return {
      canGenerateImage: canGenerate,
      canTrainModel: true, // Not checking model limits for image generation
      reason: canGenerate ? undefined : 'Image generation limit reached'
    };
  }
  
  if (action === 'train_model') {
    const canTrain = limits.modelTrainingLimit === null || 
                    limits.remainingModels! > 0;
    
    return {
      canGenerateImage: true, // Not checking image limits for model training
      canTrainModel: canTrain,
      reason: canTrain ? undefined : 'Model training limit reached'
    };
  }
  
  return {
    canGenerateImage: true,
    canTrainModel: true
  };
}

/**
 * Get the start and end dates for a billing period
 */
export function getBillingPeriodDates(date: Date = new Date()): { start: Date; end: Date } {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  
  return { start, end };
}

/**
 * Check if a date is within the current billing period
 */
export function isInCurrentBillingPeriod(date: Date, subscription: UserSubscription): boolean {
  const period = getCurrentBillingPeriod(subscription);
  return isWithinInterval(date, { start: period.start, end: period.end });
}

/**
 * Get subscription status display text
 */
export function getSubscriptionStatusText(status: SubscriptionStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'trialing':
      return 'Trial';
    case 'cancelled':
      return 'Cancelled';
    case 'expired':
      return 'Expired';
    case 'past_due':
      return 'Past Due';
    default:
      return 'Unknown';
  }
}

/**
 * Get subscription status color for UI
 */
export function getSubscriptionStatusColor(status: SubscriptionStatus): string {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'green';
    case 'cancelled':
    case 'expired':
      return 'red';
    case 'past_due':
      return 'yellow';
    default:
      return 'gray';
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

/**
 * Get plan features as a readable list
 */
export function getPlanFeaturesList(plan: SubscriptionPlan): string[] {
  const features: string[] = [];
  
  if (plan.imageGenerationLimit === null) {
    features.push('Unlimited image generation');
  } else {
    features.push(`${plan.imageGenerationLimit.toLocaleString()} images per month`);
  }
  
  if (plan.modelTrainingLimit === null) {
    features.push('Unlimited model training');
  } else {
    features.push(`${plan.modelTrainingLimit} models per month`);
  }
  
  if (plan.features.prioritySupport) {
    features.push('Priority support');
  }
  
  if (plan.features.advancedFeatures) {
    features.push('Advanced features');
  }
  
  if (plan.features.apiAccess) {
    features.push('API access');
  }
  
  if (plan.features.teamManagement) {
    features.push('Team management');
  }
  
  return features;
}

/**
 * Check if user is on free tier (first month trial)
 */
export function isFreeTierUser(subscription: UserSubscription): boolean {
  return subscription.status === 'trialing' && 
         subscription.trialStart !== null && 
         subscription.trialEnd !== null;
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(subscription: UserSubscription): number | null {
  if (!isFreeTierUser(subscription) || !subscription.trialEnd) {
    return null;
  }
  
  const now = new Date();
  const trialEnd = new Date(subscription.trialEnd);
  const diffTime = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Get days remaining in current billing period
 */
export function getBillingPeriodDaysRemaining(subscription: UserSubscription): number {
  const now = new Date();
  const periodEnd = new Date(subscription.currentPeriodEnd);
  const diffTime = periodEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Check if billing period has rolled over and create new usage tracking if needed
 */
export async function handleBillingPeriodRollover(
  db: any,
  subscription: UserSubscription,
  plan: any,
  dbUser: any
): Promise<{ needsRollover: boolean; newUsage?: any }> {
  const now = new Date();
  const periodEnd = new Date(subscription.currentPeriodEnd);
  
  // Check if current period has ended
  if (now <= periodEnd) {
    return { needsRollover: false };
  }
  
  // Period has ended, create new usage tracking record
  const newPeriodStart = periodEnd;
  const newPeriodEnd = new Date(newPeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  try {
    // Create new usage tracking record for new billing period
    const newUsageResult = await db.insert(usageTracking).values({
      userId: dbUser.id,
      subscriptionId: subscription.id,
      periodStart: newPeriodStart,
      periodEnd: newPeriodEnd,
      imagesGeneratedCount: 0,
      modelsTrainedCount: 0,
      imageGenerationLimit: plan.imageGenerationLimit,
      modelTrainingLimit: plan.modelTrainingLimit,
      createdAt: now,
      updatedAt: now
    }).returning();
    
    const newUsage = newUsageResult[0];
    
    console.log(`Billing period rolled over for user ${dbUser.id}. New usage record created.`);
    
    return { 
      needsRollover: true, 
      newUsage 
    };
  } catch (error) {
    console.error('Error creating new usage tracking record for rollover:', error);
    return { needsRollover: false };
  }
} 