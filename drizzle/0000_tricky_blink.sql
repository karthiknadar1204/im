CREATE TABLE "generated_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_id" integer,
	"model" text DEFAULT '',
	"image_name" text,
	"prompt" text,
	"guidance" numeric,
	"num_inference_steps" numeric,
	"output_format" text,
	"WIDTH" numeric,
	"HEIGHT" numeric,
	"aspect_ratio" text,
	"image_urls" jsonb
);
--> statement-breakpoint
CREATE TABLE "model_training" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"model_name" text NOT NULL,
	"gender" text NOT NULL,
	"training_data_url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"training_job_id" text,
	"model_id" text,
	"version" text,
	"error_message" text,
	"training_progress" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subscription_id" integer,
	"dodo_payment_id" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text NOT NULL,
	"payment_method" text,
	"billing_period" text,
	"failure_reason" text,
	"refunded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_transactions_dodo_payment_id_unique" UNIQUE("dodo_payment_id")
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"image_generation_limit" integer,
	"model_training_limit" integer,
	"features" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"dodo_plan_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "usage_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subscription_id" integer,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"images_generated_count" integer DEFAULT 0 NOT NULL,
	"models_trained_count" integer DEFAULT 0 NOT NULL,
	"image_generation_limit" integer,
	"model_training_limit" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"dodo_subscription_id" text,
	"dodo_customer_id" text,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_subscriptions_dodo_subscription_id_unique" UNIQUE("dodo_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"clerk_id" text NOT NULL,
	"image" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"dodo_event_id" text,
	"event_type" text NOT NULL,
	"event_data" jsonb NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processing_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	CONSTRAINT "webhook_events_dodo_event_id_unique" UNIQUE("dodo_event_id")
);
--> statement-breakpoint
ALTER TABLE "generated_images" ADD CONSTRAINT "generated_images_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_training" ADD CONSTRAINT "model_training_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "usage_tracking_subscription_period_unique" ON "usage_tracking" USING btree ("subscription_id","period_start","period_end");