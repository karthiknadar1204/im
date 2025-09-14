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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    generatedImages: many(generatedImages),
    modelTraining: many(modelTraining),
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

// Note: Indexes are automatically created by Drizzle based on .unique() constraints
// Additional indexes can be added in migration files if needed for performance
