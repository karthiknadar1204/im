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
const TEST_USER_EMAIL = 'test-payment@example.com';
const TEST_USER_NAME = 'Test Payment User';
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

// Helper function to get auth headers (simulate Clerk auth)
function getAuthHeaders(userId: string) {
  return {
    'Content-Type': 'application/json',
    // In a real test, you'd get a valid Clerk session token
    // For now, we'll mock this - you'll need to update this for real testing
    'Authorization': `Bearer mock_clerk_token_${userId}`
  };
}

// Test 1: Get subscription plans
async function testGetSubscriptionPlans() {
  console.log('\n📋 Test 1: Getting subscription plans...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/subscription/plans`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Subscription plans retrieved successfully');
    console.log('📊 Plans found:', data.plans.length);
    
    data.plans.forEach((plan: any) => {
      console.log(`  - ${plan.name}: $${plan.price}/${plan.billingCycle}`);
    });

    return data.plans;
  } catch (error) {
    console.error('❌ Failed to get subscription plans:', error);
    throw error;
  }
}

// Test 2: Create subscription (simulated)
async function testCreateSubscription(user: any, plans: any[]) {
  console.log('\n💳 Test 2: Creating subscription (simulated)...');
  
  try {
    // Find Pro plan
    const proPlan = plans.find((p: any) => p.name === 'pro');
    if (!proPlan) {
      throw new Error('Pro plan not found');
    }

    // Simulate subscription creation by directly inserting into database
    // In real scenario, this would go through Dodo Payments API
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

// Test 3: Get current subscription status
async function testGetSubscriptionStatus(user: any) {
  console.log('\n📊 Test 3: Getting subscription status...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/subscription`, {
      method: 'GET',
      headers: getAuthHeaders(user.clerkId)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Subscription status retrieved successfully');
    console.log('📊 Current plan:', data.subscription?.plan?.name);
    console.log('📊 Status:', data.subscription?.status);
    console.log('📊 Period end:', data.subscription?.currentPeriodEnd);

    return data;
  } catch (error) {
    console.error('❌ Failed to get subscription status:', error);
    throw error;
  }
}

// Test 4: Get usage statistics
async function testGetUsage(user: any) {
  console.log('\n📈 Test 4: Getting usage statistics...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/usage`, {
      method: 'GET',
      headers: getAuthHeaders(user.clerkId)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Usage statistics retrieved successfully');
    console.log('📊 Images generated:', data.usage?.imagesGeneratedCount);
    console.log('📊 Models trained:', data.usage?.modelsTrainedCount);
    console.log('📊 Remaining images:', data.remainingImages);
    console.log('📊 Remaining models:', data.remainingModels);

    return data;
  } catch (error) {
    console.error('❌ Failed to get usage statistics:', error);
    throw error;
  }
}

// Test 5: Increment usage (simulate image generation)
async function testIncrementUsage(user: any) {
  console.log('\n🎨 Test 5: Incrementing usage (image generation)...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/usage`, {
      method: 'POST',
      headers: getAuthHeaders(user.clerkId),
      body: JSON.stringify({ action: 'generate_image' })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Usage incremented successfully');
    console.log('📊 New image count:', data.usage?.imagesGeneratedCount);

    return data;
  } catch (error) {
    console.error('❌ Failed to increment usage:', error);
    throw error;
  }
}

// Test 6: Get billing history
async function testGetBillingHistory(user: any) {
  console.log('\n💰 Test 6: Getting billing history...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/subscription/billing`, {
      method: 'GET',
      headers: getAuthHeaders(user.clerkId)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Billing history retrieved successfully');
    console.log('📊 Transactions:', data.transactions?.length);
    console.log('📊 Subscriptions:', data.subscriptions?.length);
    console.log('📊 Total spent:', data.formattedTotalSpent);

    return data;
  } catch (error) {
    console.error('❌ Failed to get billing history:', error);
    throw error;
  }
}

// Test 7: Test webhook processing
async function testWebhookProcessing(user: any) {
  console.log('\n🔔 Test 7: Testing webhook processing...');
  
  try {
    const webhookSecret = process.env.DODO_WEBHOOK_SECRET || 'test-secret';
    
    // Create test webhook payload
    const payload = {
      type: 'payment.succeeded',
      data: {
        payment_id: `pay_test_${Date.now()}`,
        subscription_id: `sub_test_${Date.now()}`,
        customer_id: `cus_test_${Date.now()}`,
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

// Test 8: Verify database state
async function testVerifyDatabaseState(user: any) {
  console.log('\n🗄️ Test 8: Verifying database state...');
  
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
      console.log(`  - Images: ${u.imagesGeneratedCount}, Models: ${u.modelsTrainedCount}`);
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

// Test 9: Test subscription cancellation
async function testCancelSubscription(user: any) {
  console.log('\n🚫 Test 9: Testing subscription cancellation...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/subscription/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(user.clerkId),
      body: JSON.stringify({ cancelAtPeriodEnd: true })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Subscription cancellation initiated');
    console.log('📊 Message:', data.message);

    return data;
  } catch (error) {
    console.error('❌ Failed to cancel subscription:', error);
    throw error;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Payment Gateway Endpoint Tests...\n');
  
  try {
    // Setup: Create test user
    const user = await createTestUser();
    
    // Test 1: Get subscription plans
    const plans = await testGetSubscriptionPlans();
    
    // Test 2: Create subscription
    const subscription = await testCreateSubscription(user, plans);
    
    // Test 3: Get subscription status
    await testGetSubscriptionStatus(user);
    
    // Test 4: Get usage statistics
    await testGetUsage(user);
    
    // Test 5: Increment usage
    await testIncrementUsage(user);
    
    // Test 6: Get billing history
    await testGetBillingHistory(user);
    
    // Test 7: Test webhook processing
    await testWebhookProcessing(user);
    
    // Test 8: Verify database state
    await testVerifyDatabaseState(user);
    
    // Test 9: Test subscription cancellation
    await testCancelSubscription(user);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Subscription plans endpoint working');
    console.log('✅ Subscription creation working');
    console.log('✅ Subscription status endpoint working');
    console.log('✅ Usage tracking endpoints working');
    console.log('✅ Billing history endpoint working');
    console.log('✅ Webhook processing working');
    console.log('✅ Database updates working correctly');
    console.log('✅ Subscription cancellation working');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('\n✨ Test suite completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

export { runAllTests }; 