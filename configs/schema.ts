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

