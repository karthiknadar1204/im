import { db } from '../configs/db';
import { users, userSubscriptions, subscriptionPlans, usageTracking } from '../configs/schema';
import { eq, desc } from 'drizzle-orm';

async function checkUserSubscription() {
  try {
    console.log('=== Database Check ===');
    
    // Check if subscription plans exist
    const plans = await db.select().from(subscriptionPlans);
    console.log('Subscription Plans:', plans);
    
    // Check all users
    const allUsers = await db.select().from(users);
    console.log('All Users:', allUsers);
    
    if (allUsers.length === 0) {
      console.log('No users found in database');
      return;
    }
    
    // Check subscriptions for the first user
    const firstUser = allUsers[0];
    console.log('Checking subscriptions for user:', firstUser);
    
    const subscriptions = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.userId, firstUser.id))
      .orderBy(desc(userSubscriptions.createdAt));
    
    console.log('User Subscriptions:', subscriptions);
    
    // Check usage tracking
    const usage = await db.select().from(usageTracking)
      .where(eq(usageTracking.userId, firstUser.id));
    
    console.log('Usage Tracking:', usage);
    
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkUserSubscription(); 