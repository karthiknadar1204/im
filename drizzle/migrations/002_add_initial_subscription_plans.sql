-- Migration: Add Initial Subscription Plans with Dodo Product IDs
-- This migration inserts the subscription plans with actual Dodo product IDs

-- Insert subscription plans with Dodo product IDs
INSERT INTO "subscription_plans" (
    "name", 
    "display_name", 
    "description", 
    "price", 
    "currency", 
    "billing_cycle", 
    "image_generation_limit", 
    "model_training_limit", 
    "features",
    "dodo_plan_id"
) VALUES 
(
    'free',
    'Free',
    'Perfect for getting started. 100 images and 1 model training for your first month.',
    0.00,
    'USD',
    'monthly',
    100,
    1,
    '{"priority_support": false, "advanced_features": false, "api_access": false}',
    NULL
),
(
    'pro',
    'Pro',
    'For power users. 300 images and 3 model trainings per month.',
    20.00,
    'USD',
    'monthly',
    300,
    3,
    '{"priority_support": true, "advanced_features": true, "api_access": false}',
    'pdt_TjB5s0f7ug3sV1cG41uaX'
),
(
    'enterprise',
    'Enterprise',
    'For teams and businesses. Unlimited images and 5 model trainings per month.',
    50.00,
    'USD',
    'monthly',
    NULL,
    5,
    '{"priority_support": true, "advanced_features": true, "api_access": true, "team_management": true}',
    'pdt_CMqQUDwjosU9BnHcNPUdO'
)
ON CONFLICT (name) DO UPDATE SET
    "display_name" = EXCLUDED."display_name",
    "description" = EXCLUDED."description",
    "price" = EXCLUDED."price",
    "image_generation_limit" = EXCLUDED."image_generation_limit",
    "model_training_limit" = EXCLUDED."model_training_limit",
    "features" = EXCLUDED."features",
    "dodo_plan_id" = EXCLUDED."dodo_plan_id",
    "updated_at" = NOW(); 