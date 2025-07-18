import { db } from '@/configs/db';
import { 
  userSubscriptions, 
  usageTracking, 
  users,
  subscriptionPlans
} from '@/configs/schema';
import { eq, desc } from 'drizzle-orm';

async function simulateExpiredSubscription() {
  console.log('🔄 Simulating expired subscription for testing...\n');

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
    
    console.log(`📅 Original subscription period: ${subscription.currentPeriodStart} to ${subscription.currentPeriodEnd}`);

    // Set the subscription to expire yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dayBeforeYesterday = new Date();
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);

    // Update the subscription to be expired
    await db.update(userSubscriptions)
      .set({
        currentPeriodStart: dayBeforeYesterday,
        currentPeriodEnd: yesterday,
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.id, subscription.id));

    console.log(`⏰ Updated subscription to expire yesterday: ${dayBeforeYesterday} to ${yesterday}`);

    // Verify the update
    const updatedSubscriptionResult = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.id, subscription.id));
    const updatedSubscription = updatedSubscriptionResult[0];
    
    console.log(`✅ Updated subscription period: ${updatedSubscription.currentPeriodStart} to ${updatedSubscription.currentPeriodEnd}`);

    console.log('\n🎯 Subscription is now expired and ready for rollover testing!');
    console.log('💡 Run the test-billing-rollover.ts script to test the rollover functionality.');

  } catch (error) {
    console.error('❌ Error simulating expired subscription:', error);
  }
}

// Run the simulation
simulateExpiredSubscription()
  .then(() => {
    console.log('\n🏁 Simulation finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Simulation failed:', error);
    process.exit(1);
  }); 