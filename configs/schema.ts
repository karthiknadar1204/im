import {
    pgTable,
    serial,
    text,
    date,
    integer,
    numeric,
    varchar,
    boolean,
    timestamp,
    jsonb,
    primaryKey,
    uniqueIndex,
    bigint,
    uuid,
  } from 'drizzle-orm/pg-core';
  import { relations } from 'drizzle-orm';

export const users=pgTable('users',{
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    clerkId: text('clerk_id').notNull().unique(),
    image: text('image').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const generatedImages = pgTable('generated_images', {
    id: serial('id').primaryKey(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    userId: integer('user_id').references(() => users.id),
    model: text('model').default(''),
    imageName: text('image_name'),
    prompt: text('prompt'),
    guidance: numeric('guidance'),
    numInferenceSteps: numeric('num_inference_steps'),
    outputFormat: text('output_format'),
    width: numeric('WIDTH'),
    height: numeric('HEIGHT'),
    aspectRatio: text('aspect_ratio'),
    imageUrls: jsonb('image_urls'),
});

export const modelTraining = pgTable('model_training', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    modelName: text('model_name').notNull(),
    gender: text('gender').notNull(), // 'male' | 'female'
    trainingDataUrl: text('training_data_url').notNull(), // signed Cloudflare R2 URL
    status: text('status').notNull().default('pending'), // 'pending' | 'training' | 'completed' | 'failed'
    trainingJobId: text('training_job_id'), // external ML service job ID
    modelId: text('model_id'), // final trained model ID
    version: text('version'), // trained model version from Replicate
    errorMessage: text('error_message'), // for failed training
    trainingProgress: integer('training_progress').default(0), // 0-100
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'), // nullable
});

// Payment Gateway Schema Tables

export const subscriptionPlans = pgTable('subscription_plans', {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(), // 'free', 'pro', 'enterprise'
    displayName: text('display_name').notNull(), // 'Free', 'Pro', 'Enterprise'
    description: text('description'),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(), // 0.00 for free
    currency: text('currency').notNull().default('USD'),
    billingCycle: text('billing_cycle').notNull().default('monthly'), // 'monthly', 'yearly'
    imageGenerationLimit: integer('image_generation_limit'), // null for unlimited
    modelTrainingLimit: integer('model_training_limit'), // null for unlimited
    features: jsonb('features'), // additional features as JSON
    isActive: boolean('is_active').notNull().default(true),
    dodoPlanId: text('dodo_plan_id'), // Dodo Payments plan ID
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const userSubscriptions = pgTable('user_subscriptions', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    planId: integer('plan_id').references(() => subscriptionPlans.id).notNull(),
    status: text('status').notNull().default('active'), // 'active', 'cancelled', 'expired', 'past_due', 'trialing'
    currentPeriodStart: timestamp('current_period_start').notNull(),
    currentPeriodEnd: timestamp('current_period_end').notNull(),
    trialStart: timestamp('trial_start'), // for free tier users
    trialEnd: timestamp('trial_end'), // for free tier users
    dodoSubscriptionId: text('dodo_subscription_id').unique(),
    dodoCustomerId: text('dodo_customer_id'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    cancelledAt: timestamp('cancelled_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const usageTracking = pgTable('usage_tracking', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    subscriptionId: integer('subscription_id').references(() => userSubscriptions.id),
    periodStart: timestamp('period_start').notNull(), // billing period start
    periodEnd: timestamp('period_end').notNull(), // billing period end
    imagesGeneratedCount: integer('images_generated_count').notNull().default(0),
    modelsTrainedCount: integer('models_trained_count').notNull().default(0),
    imageGenerationLimit: integer('image_generation_limit'), // limit for this period
    modelTrainingLimit: integer('model_training_limit'), // limit for this period
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const paymentTransactions = pgTable('payment_transactions', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    subscriptionId: integer('subscription_id').references(() => userSubscriptions.id),
    dodoPaymentId: text('dodo_payment_id').unique(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    status: text('status').notNull(), // 'pending', 'succeeded', 'failed', 'refunded'
    paymentMethod: text('payment_method'), // 'card', 'bank_transfer', etc.
    billingPeriod: text('billing_period'), // 'monthly', 'yearly'
    failureReason: text('failure_reason'), // for failed payments
    refundedAt: timestamp('refunded_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const webhookEvents = pgTable('webhook_events', {
    id: serial('id').primaryKey(),
    dodoEventId: text('dodo_event_id').unique(),
    eventType: text('event_type').notNull(), // 'subscription.created', 'payment.succeeded', etc.
    eventData: jsonb('event_data').notNull(), // full event payload
    processed: boolean('processed').notNull().default(false),
    processingError: text('processing_error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    processedAt: timestamp('processed_at'),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    generatedImages: many(generatedImages),
    modelTraining: many(modelTraining),
    subscriptions: many(userSubscriptions),
    usageTracking: many(usageTracking),
    paymentTransactions: many(paymentTransactions),
}));

export const generatedImagesRelations = relations(generatedImages, ({ one }) => ({
    user: one(users, {
        fields: [generatedImages.userId],
        references: [users.id],
    }),
}));

export const modelTrainingRelations = relations(modelTraining, ({ one }) => ({
    user: one(users, {
        fields: [modelTraining.userId],
        references: [users.id],
    }),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
    subscriptions: many(userSubscriptions),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one, many }) => ({
    user: one(users, {
        fields: [userSubscriptions.userId],
        references: [users.id],
    }),
    plan: one(subscriptionPlans, {
        fields: [userSubscriptions.planId],
        references: [subscriptionPlans.id],
    }),
    usageTracking: many(usageTracking),
    paymentTransactions: many(paymentTransactions),
}));

export const usageTrackingRelations = relations(usageTracking, ({ one }) => ({
    user: one(users, {
        fields: [usageTracking.userId],
        references: [users.id],
    }),
    subscription: one(userSubscriptions, {
        fields: [usageTracking.subscriptionId],
        references: [userSubscriptions.id],
    }),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
    user: one(users, {
        fields: [paymentTransactions.userId],
        references: [users.id],
    }),
    subscription: one(userSubscriptions, {
        fields: [paymentTransactions.subscriptionId],
        references: [userSubscriptions.id],
    }),
}));

// Note: Indexes are automatically created by Drizzle based on .unique() constraints
// Additional indexes can be added in migration files if needed for performance

