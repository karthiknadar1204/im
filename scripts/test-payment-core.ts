import { db } from '@/configs/db';
import { 
  users, 
  subscriptionPlans, 
  userSubscriptions, 
  paymentTransactions, 
  usageTracking, 
  webhookEvents 
} from '@/configs/schema';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';

// Test configuration
const TEST_USER_EMAIL = 'test-core@example.com';
const TEST_USER_NAME = 'Test Core User';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Helper function to create a test user
async function createTestUser() {
  console.log('🔧 Creating test user...');
  
  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, TEST_USER_EMAIL)
  });

  if (existingUser) {
    console.log('✅ Test user already exists:', existingUser.id);
    return existingUser;
  }

  // Create new test user
  const newUser = await db.insert(users).values({
    email: TEST_USER_EMAIL,
    name: TEST_USER_NAME,
    clerkId: `test_clerk_${Date.now()}`,
    image: 'https://example.com/default-avatar.png', // Required field
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();

  console.log('✅ Created test user:', newUser[0].id);
  return newUser[0];
}

// Test 1: Verify subscription plans exist
async function testSubscriptionPlans() {
  console.log('\n📋 Test 1: Verifying subscription plans...');
  
  try {
    const plans = await db.query.subscriptionPlans.findMany({
      where: eq(subscriptionPlans.isActive, true),
      orderBy: (subscriptionPlans, { asc }) => [asc(subscriptionPlans.price)]
    });

    console.log('✅ Subscription plans found:', plans.length);
    plans.forEach(plan => {
      console.log(`  - ${plan.name}: $${plan.price}/${plan.billingCycle}`);
      console.log(`    Images: ${plan.imageGenerationLimit || 'unlimited'}, Models: ${plan.modelTrainingLimit}`);
    });

    return plans;
  } catch (error) {
    console.error('❌ Failed to get subscription plans:', error);
    throw error;
  }
}

// Test 2: Create subscription directly in database
async function testCreateSubscription(user: any, plans: any[]) {
  console.log('\n💳 Test 2: Creating subscription in database...');
  
  try {
    // Find Pro plan
    const proPlan = plans.find((p: any) => p.name === 'pro');
    if (!proPlan) {
      throw new Error('Pro plan not found');
    }

    // Create subscription directly in database
    const subscription = await db.insert(userSubscriptions).values({
      userId: user.id,
      planId: proPlan.id,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      dodoSubscriptionId: `sub_test_${Date.now()}`,
      dodoCustomerId: `cus_test_${Date.now()}`,
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log('✅ Subscription created successfully');
    console.log('📊 Subscription ID:', subscription[0].id);
    console.log('📊 Dodo Subscription ID:', subscription[0].dodoSubscriptionId);

    return subscription[0];
  } catch (error) {
    console.error('❌ Failed to create subscription:', error);
    throw error;
  }
}

// Test 3: Create usage tracking record
async function testCreateUsageTracking(user: any, subscription: any) {
  console.log('\n📈 Test 3: Creating usage tracking record...');
  
  try {
    const billingPeriod = {
      start: new Date(),
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };

    const usage = await db.insert(usageTracking).values({
      userId: user.id,
      subscriptionId: subscription.id,
      periodStart: billingPeriod.start,
      periodEnd: billingPeriod.end,
      imagesGeneratedCount: 0,
      modelsTrainedCount: 0,
      imageGenerationLimit: 300, // Pro plan limit
      modelTrainingLimit: 3, // Pro plan limit
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log('✅ Usage tracking record created');
    console.log('📊 Usage ID:', usage[0].id);
    console.log('📊 Image limit:', usage[0].imageGenerationLimit);
    console.log('📊 Model limit:', usage[0].modelTrainingLimit);

    return usage[0];
  } catch (error) {
    console.error('❌ Failed to create usage tracking:', error);
    throw error;
  }
}

// Test 4: Increment usage
async function testIncrementUsage(usage: any) {
  console.log('\n🎨 Test 4: Incrementing usage...');
  
  try {
    // Increment image generation count
    const updatedUsage = await db.update(usageTracking)
      .set({
        imagesGeneratedCount: usage.imagesGeneratedCount + 1,
        updatedAt: new Date()
      })
      .where(eq(usageTracking.id, usage.id))
      .returning();

    console.log('✅ Usage incremented successfully');
    console.log('📊 New image count:', updatedUsage[0].imagesGeneratedCount);
    console.log('📊 Remaining images:', updatedUsage[0].imageGenerationLimit - updatedUsage[0].imagesGeneratedCount);

    return updatedUsage[0];
  } catch (error) {
    console.error('❌ Failed to increment usage:', error);
    throw error;
  }
}

// Test 5: Create payment transaction
async function testCreatePaymentTransaction(user: any, subscription: any) {
  console.log('\n💰 Test 5: Creating payment transaction...');
  
  try {
    const transaction = await db.insert(paymentTransactions).values({
      userId: user.id,
      subscriptionId: subscription.id,
      dodoPaymentId: `pay_test_${Date.now()}`,
      amount: 20.00, // $20.00
      currency: 'USD',
      status: 'succeeded',
      paymentMethod: 'card',
      billingPeriod: 'monthly',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log('✅ Payment transaction created');
    console.log('📊 Transaction ID:', transaction[0].id);
    console.log('📊 Amount:', `$${transaction[0].amount} ${transaction[0].currency}`);
    console.log('📊 Status:', transaction[0].status);

    return transaction[0];
  } catch (error) {
    console.error('❌ Failed to create payment transaction:', error);
    throw error;
  }
}

// Test 6: Test webhook processing
async function testWebhookProcessing(user: any) {
  console.log('\n🔔 Test 6: Testing webhook processing...');
  
  try {
    const webhookSecret = process.env.DODO_WEBHOOK_SECRET || 'test-secret';
    
    // Create test webhook payload
    const payload = {
      type: 'payment.succeeded',
      data: {
        payment_id: `pay_webhook_${Date.now()}`,
        subscription_id: `sub_webhook_${Date.now()}`,
        customer_id: `cus_webhook_${Date.now()}`,
        customer_email: user.email,
        amount: 2000, // $20.00 in cents
        currency: 'USD',
        status: 'succeeded',
        payment_method: 'card'
      }
    };

    const payloadString = JSON.stringify(payload);
    
    // Generate webhook signature
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payloadString, 'utf8')
      .digest('hex');

    const webhookId = `wh_test_${Date.now()}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();

    console.log('📤 Sending test webhook...');
    console.log('📊 Webhook ID:', webhookId);
    console.log('📊 Event type:', payload.type);
    
    const response = await fetch(`${BASE_URL}/api/webhook/dodo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'webhook-id': webhookId,
        'webhook-signature': signature,
        'webhook-timestamp': timestamp,
      },
      body: payloadString,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Webhook processed successfully');
    console.log('📊 Response:', data.message);

    return data;
  } catch (error) {
    console.error('❌ Failed to process webhook:', error);
    throw error;
  }
}

// Test 7: Verify database state
async function testVerifyDatabaseState(user: any) {
  console.log('\n🗄️ Test 7: Verifying database state...');
  
  try {
    // Check user subscriptions
    const subscriptions = await db.query.userSubscriptions.findMany({
      where: eq(userSubscriptions.userId, user.id),
      with: { plan: true },
      orderBy: (userSubscriptions, { desc }) => [desc(userSubscriptions.createdAt)]
    });

    console.log('📊 User subscriptions:', subscriptions.length);
    subscriptions.forEach(sub => {
      console.log(`  - ${sub.plan?.name}: ${sub.status} (${sub.dodoSubscriptionId})`);
    });

    // Check payment transactions
    const transactions = await db.query.paymentTransactions.findMany({
      where: eq(paymentTransactions.userId, user.id),
      orderBy: (paymentTransactions, { desc }) => [desc(paymentTransactions.createdAt)]
    });

    console.log('📊 Payment transactions:', transactions.length);
    transactions.forEach(tx => {
      console.log(`  - $${tx.amount} ${tx.currency}: ${tx.status} (${tx.dodoPaymentId})`);
    });

    // Check usage tracking
    const usage = await db.query.usageTracking.findMany({
      where: eq(usageTracking.userId, user.id),
      orderBy: (usageTracking, { desc }) => [desc(usageTracking.createdAt)]
    });

    console.log('📊 Usage tracking records:', usage.length);
    usage.forEach(u => {
      console.log(`  - Images: ${u.imagesGeneratedCount}/${u.imageGenerationLimit}, Models: ${u.modelsTrainedCount}/${u.modelTrainingLimit}`);
    });

    // Check webhook events
    const webhooks = await db.query.webhookEvents.findMany({
      orderBy: (webhookEvents, { desc }) => [desc(webhookEvents.createdAt)],
      limit: 5
    });

    console.log('📊 Recent webhook events:', webhooks.length);
    webhooks.forEach(wh => {
      console.log(`  - ${wh.eventType}: ${wh.processed ? '✅' : '❌'} (${wh.dodoEventId})`);
    });

    return { subscriptions, transactions, usage, webhooks };
  } catch (error) {
    console.error('❌ Failed to verify database state:', error);
    throw error;
  }
}

// Test 8: Test subscription cancellation
async function testCancelSubscription(user: any) {
  console.log('\n🚫 Test 8: Testing subscription cancellation...');
  
  try {
    // Get active subscription
    const subscription = await db.query.userSubscriptions.findFirst({
      where: and(
        eq(userSubscriptions.userId, user.id),
        eq(userSubscriptions.status, 'active')
      )
    });

    if (!subscription) {
      console.log('⚠️ No active subscription found to cancel');
      return null;
    }

    // Update subscription to cancelled
    const updatedSubscription = await db.update(userSubscriptions)
      .set({
        status: 'cancelled',
        cancelAtPeriodEnd: true,
        cancelledAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.id, subscription.id))
      .returning();

    console.log('✅ Subscription cancelled successfully');
    console.log('📊 New status:', updatedSubscription[0].status);
    console.log('📊 Cancelled at:', updatedSubscription[0].cancelledAt);

    return updatedSubscription[0];
  } catch (error) {
    console.error('❌ Failed to cancel subscription:', error);
    throw error;
  }
}

// Main test runner
async function runCoreTests() {
  console.log('🚀 Starting Payment Gateway Core Tests...\n');
  
  try {
    // Setup: Create test user
    const user = await createTestUser();
    
    // Test 1: Verify subscription plans
    const plans = await testSubscriptionPlans();
    
    // Test 2: Create subscription
    const subscription = await testCreateSubscription(user, plans);
    
    // Test 3: Create usage tracking
    const usage = await testCreateUsageTracking(user, subscription);
    
    // Test 4: Increment usage
    await testIncrementUsage(usage);
    
    // Test 5: Create payment transaction
    await testCreatePaymentTransaction(user, subscription);
    
    // Test 6: Test webhook processing
    await testWebhookProcessing(user);
    
    // Test 7: Verify database state
    await testVerifyDatabaseState(user);
    
    // Test 8: Test subscription cancellation
    await testCancelSubscription(user);
    
    console.log('\n🎉 All core tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Subscription plans verified');
    console.log('✅ Subscription creation working');
    console.log('✅ Usage tracking working');
    console.log('✅ Usage increment working');
    console.log('✅ Payment transaction creation working');
    console.log('✅ Webhook processing working');
    console.log('✅ Database state verification working');
    console.log('✅ Subscription cancellation working');
    
  } catch (error) {
    console.error('\n💥 Core test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runCoreTests()
    .then(() => {
      console.log('\n✨ Core test suite completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Core test suite failed:', error);
      process.exit(1);
    });
}

export { runCoreTests }; 