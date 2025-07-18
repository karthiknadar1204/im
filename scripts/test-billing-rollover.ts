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
  handleBillingPeriodRollover,
  isSubscriptionExpired
} from '@/lib/utils/subscription';

async function testBillingRollover() {
  console.log('🧪 Testing Billing Period Rollover...\n');

  try {
    // Get a test user (first user in the system)
    const userResult = await db.select().from(users).limit(1);
    if (userResult.length === 0) {
      console.log('❌ No users found in database. Please create a user first.');
      return;
    }
    const testUser = userResult[0];
    console.log(`👤 Using test user: ${testUser.name} (${testUser.email})`);

    // Get user's subscription
    const subscriptionResult = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.userId, testUser.id))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);
    
    if (subscriptionResult.length === 0) {
      console.log('❌ No subscription found for test user.');
      return;
    }
    const subscription = subscriptionResult[0];
    console.log(`📅 Current subscription period: ${subscription.currentPeriodStart} to ${subscription.currentPeriodEnd}`);

    // Get subscription plan
    const planResult = await db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, subscription.planId));
    const plan = planResult[0];
    console.log(`📋 Plan: ${plan.name} (${plan.displayName})`);

    // Check if subscription is expired
    const isExpired = isSubscriptionExpired(subscription);
    console.log(`⏰ Subscription expired: ${isExpired}`);

    // Get current billing period
    const billingPeriod = getCurrentBillingPeriod(subscription);
    console.log(`📊 Current billing period: ${billingPeriod.start} to ${billingPeriod.end}`);
    console.log(`🔍 Is current period: ${billingPeriod.isCurrent}`);

    // Get current usage
    const usageResult = await db.select().from(usageTracking)
      .where(and(
        eq(usageTracking.userId, testUser.id),
        eq(usageTracking.subscriptionId, subscription.id),
        gte(usageTracking.periodStart, billingPeriod.start),
        lte(usageTracking.periodEnd, billingPeriod.end)
      ))
      .limit(1);
    
    if (usageResult.length > 0) {
      const usage = usageResult[0];
      console.log(`📈 Current usage: ${usage.imagesGeneratedCount} images, ${usage.modelsTrainedCount} models`);
    } else {
      console.log(`📈 No usage tracking found for current period`);
    }

    // Test rollover function
    console.log('\n🔄 Testing rollover function...');
    const rolloverResult = await handleBillingPeriodRollover(db, subscription, plan, testUser);
    
    if (rolloverResult.needsRollover) {
      console.log('✅ Rollover needed and new usage record created!');
      console.log(`📊 New usage record ID: ${rolloverResult.newUsage?.id}`);
      console.log(`📅 New period: ${rolloverResult.newUsage?.periodStart} to ${rolloverResult.newUsage?.periodEnd}`);
      console.log(`🎯 New limits: ${rolloverResult.newUsage?.imageGenerationLimit} images, ${rolloverResult.newUsage?.modelTrainingLimit} models`);
    } else {
      console.log('ℹ️ No rollover needed - current period is still active');
    }

    // Show all usage records for this subscription
    console.log('\n📋 All usage records for this subscription:');
    const allUsageResult = await db.select().from(usageTracking)
      .where(eq(usageTracking.subscriptionId, subscription.id))
      .orderBy(desc(usageTracking.periodStart));
    
    allUsageResult.forEach((usage, index) => {
      console.log(`${index + 1}. Period: ${usage.periodStart} to ${usage.periodEnd}`);
      console.log(`   Usage: ${usage.imagesGeneratedCount}/${usage.imageGenerationLimit} images, ${usage.modelsTrainedCount}/${usage.modelTrainingLimit} models`);
      console.log(`   Created: ${usage.createdAt}`);
      console.log('');
    });

    console.log('✅ Billing rollover test completed!');

  } catch (error) {
    console.error('❌ Error testing billing rollover:', error);
  }
}

// Run the test
testBillingRollover()
  .then(() => {
    console.log('\n🏁 Test finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }); 