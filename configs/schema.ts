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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    generatedImages: many(generatedImages),
}));

export const generatedImagesRelations = relations(generatedImages, ({ one }) => ({
    user: one(users, {
        fields: [generatedImages.userId],
        references: [users.id],
    }),
}));

