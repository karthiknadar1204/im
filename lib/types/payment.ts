// Payment Gateway Types

export type SubscriptionPlanName = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due' | 'trialing';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type BillingCycle = 'monthly' | 'yearly';

export interface SubscriptionPlan {
  id: number;
  name: SubscriptionPlanName;
  displayName: string;
  description?: string;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  imageGenerationLimit: number | null; // null for unlimited
  modelTrainingLimit: number | null; // null for unlimited
  features: PlanFeatures;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanFeatures {
  prioritySupport: boolean;
  advancedFeatures: boolean;
  apiAccess: boolean;
  teamManagement?: boolean;
}

export interface UserSubscription {
  id: number;
  userId: number;
  planId: number;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  plan?: SubscriptionPlan;
  user?: User;
}

export interface UsageTracking {
  id: number;
  userId: number;
  subscriptionId?: number;
  periodStart: Date;
  periodEnd: Date;
  imagesGeneratedCount: number;
  modelsTrainedCount: number;
  imageGenerationLimit?: number;
  modelTrainingLimit?: number;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  subscription?: UserSubscription;
  user?: User;
}

export interface PaymentTransaction {
  id: number;
  userId: number;
  subscriptionId?: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod?: string;
  billingPeriod?: BillingCycle;
  failureReason?: string;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  subscription?: UserSubscription;
  user?: User;
}

export interface WebhookEvent {
  id: number;
  eventId?: string;
  eventType: string;
  eventData: any;
  processed: boolean;
  processingError?: string;
  createdAt: Date;
  processedAt?: Date;
}

// User type (from your existing schema)
export interface User {
  id: number;
  name: string;
  email: string;
  clerkId: string;
  image: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface SubscriptionResponse {
  subscription: UserSubscription;
  usage: UsageTracking;
  canGenerateImage: boolean;
  canTrainModel: boolean;
  remainingImages: number | null; // null for unlimited
  remainingModels: number | null; // null for unlimited
}

export interface CreateSubscriptionRequest {
  planId: number;
  paymentMethodId?: string;
}

export interface UpdateSubscriptionRequest {
  planId: number;
}

export interface CancelSubscriptionRequest {
  cancelAtPeriodEnd?: boolean;
}


// Usage Calculation Types
export interface UsageLimits {
  imageGenerationLimit: number | null;
  modelTrainingLimit: number | null;
  currentImageUsage: number;
  currentModelUsage: number;
  remainingImages: number | null;
  remainingModels: number | null;
}

export interface UsageValidation {
  canGenerateImage: boolean;
  canTrainModel: boolean;
  reason?: string;
}

// Billing Period Types
export interface BillingPeriod {
  start: Date;
  end: Date;
  isCurrent: boolean;
}

// Error Types
export interface PaymentError {
  code: string;
  message: string;
  details?: any;
}

export interface SubscriptionError {
  code: 'INSUFFICIENT_QUOTA' | 'SUBSCRIPTION_EXPIRED' | 'PAYMENT_FAILED' | 'PLAN_NOT_FOUND';
  message: string;
  details?: any;
} 