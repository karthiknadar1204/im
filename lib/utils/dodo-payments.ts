import { db } from '@/configs/db';
import { subscriptionPlans, userSubscriptions, users } from '@/configs/schema';
import { eq, and } from 'drizzle-orm';

const DODO_API_BASE_URL = 'https://api.dodopayments.com/v1';
const DODO_API_KEY = process.env.DODO_PAYMENTS_API_KEY;

if (!DODO_API_KEY) {
  throw new Error('DODO_PAYMENTS_API_KEY environment variable is required');
}

interface DodoCustomer {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

interface DodoSubscription {
  id: string;
  customer_id: string;
  plan_id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  created_at: string;
}

interface DodoPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  created_at: string;
}

interface CreateSubscriptionRequest {
  customerId: string;
  planId: string;
  paymentMethodId?: string;
}

interface CreateCustomerRequest {
  email: string;
  name?: string;
}

// Create a customer in Dodo
export async function createDodoCustomer(data: CreateCustomerRequest): Promise<DodoCustomer> {
  const response = await fetch(`${DODO_API_BASE_URL}/customers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DODO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: data.email,
      name: data.name,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Dodo customer: ${error}`);
  }

  return response.json();
}

// Create a subscription in Dodo
export async function createDodoSubscription(data: CreateSubscriptionRequest): Promise<DodoSubscription> {
  const response = await fetch(`${DODO_API_BASE_URL}/subscriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DODO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer_id: data.customerId,
      plan_id: data.planId,
      payment_method_id: data.paymentMethodId,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Dodo subscription: ${error}`);
  }

  return response.json();
}

// Get subscription details from Dodo
export async function getDodoSubscription(subscriptionId: string): Promise<DodoSubscription> {
  const response = await fetch(`${DODO_API_BASE_URL}/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${DODO_API_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Dodo subscription: ${error}`);
  }

  return response.json();
}

// Cancel a subscription in Dodo
export async function cancelDodoSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<DodoSubscription> {
  const response = await fetch(`${DODO_API_BASE_URL}/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DODO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cancel_at_period_end: cancelAtPeriodEnd,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to cancel Dodo subscription: ${error}`);
  }

  return response.json();
}

// Get payment details from Dodo
export async function getDodoPayment(paymentId: string): Promise<DodoPayment> {
  const response = await fetch(`${DODO_API_BASE_URL}/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${DODO_API_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Dodo payment: ${error}`);
  }

  return response.json();
}

// Create a subscription for a user
export async function createUserSubscription(
  userId: number,
  planName: 'pro' | 'enterprise',
  paymentMethodId?: string
): Promise<{ subscription: any; customer: DodoCustomer }> {
  // Get user details
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Get subscription plan
  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.name, planName)
  });

  if (!plan || !plan.dodoPlanId) {
    throw new Error('Subscription plan not found or not configured with Dodo');
  }

  // Create or get customer in Dodo
  let customer: DodoCustomer;
  try {
    // Try to create customer
    customer = await createDodoCustomer({
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    // Customer might already exist, try to get by email
    // Note: You might need to implement a getCustomerByEmail function
    throw new Error('Failed to create customer in Dodo');
  }

  // Create subscription in Dodo
  const dodoSubscription = await createDodoSubscription({
    customerId: customer.id,
    planId: plan.dodoPlanId,
    paymentMethodId,
  });

  // Create subscription record in our database
  const subscription = await db.insert(userSubscriptions).values({
    userId: user.id,
    planId: plan.id,
    status: dodoSubscription.status,
    currentPeriodStart: new Date(dodoSubscription.current_period_start * 1000),
    currentPeriodEnd: new Date(dodoSubscription.current_period_end * 1000),
    dodoSubscriptionId: dodoSubscription.id,
    dodoCustomerId: customer.id,
    cancelAtPeriodEnd: dodoSubscription.cancel_at_period_end,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  return {
    subscription: subscription[0],
    customer,
  };
}

// Cancel a user's subscription
export async function cancelUserSubscription(
  userId: number,
  cancelAtPeriodEnd: boolean = true
): Promise<any> {
  // Get user's active subscription
  const subscription = await db.query.userSubscriptions.findFirst({
    where: and(
      eq(userSubscriptions.userId, userId),
      eq(userSubscriptions.status, 'active')
    )
  });

  if (!subscription || !subscription.dodoSubscriptionId) {
    throw new Error('No active subscription found');
  }

  // Cancel in Dodo
  const dodoSubscription = await cancelDodoSubscription(
    subscription.dodoSubscriptionId,
    cancelAtPeriodEnd
  );

  // Update in our database
  const updatedSubscription = await db.update(userSubscriptions)
    .set({
      status: dodoSubscription.status,
      cancelAtPeriodEnd: dodoSubscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.id, subscription.id))
    .returning();

  return updatedSubscription[0];
}

// Get user's subscription status
export async function getUserSubscription(userId: number) {
  const subscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, userId),
    with: {
      plan: true,
    },
  });

  return subscription;
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
} 