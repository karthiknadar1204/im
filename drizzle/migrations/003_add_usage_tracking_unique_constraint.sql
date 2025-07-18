-- Add unique constraint to prevent duplicate usage tracking entries
-- for the same subscription and billing period
CREATE UNIQUE INDEX IF NOT EXISTS "usage_tracking_subscription_period_unique" 
ON "usage_tracking" USING btree ("subscription_id","period_start","period_end"); 