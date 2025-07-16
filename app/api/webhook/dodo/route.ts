import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { 
  webhookEvents, 
  userSubscriptions, 
  paymentTransactions, 
  users,
  subscriptionPlans 
} from '@/configs/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

// Webhook signature verification
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
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

// Process subscription events
async function handleSubscriptionEvent(eventData: any) {
  const {
    subscription_id,
    customer_id,
    customer_email,
    status,
    current_period_start,
    current_period_end,
    product_id,
    cancel_at_period_end = false
  } = eventData;

  console.log('Processing subscription event:', { subscription_id, status, customer_email });

  // Find the user by email
  const user = await db.query.users.findFirst({
    where: eq(users.email, customer_email)
  });

  if (!user) {
    console.error('User not found for email:', customer_email);
    throw new Error('User not found');
  }

  // Find the subscription plan by Dodo product ID
  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.dodoPlanId, product_id)
  });

  if (!plan) {
    console.error('Subscription plan not found for product ID:', product_id);
    throw new Error('Subscription plan not found');
  }

  // Check if subscription already exists
  const existingSubscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.dodoSubscriptionId, subscription_id)
  });

  if (existingSubscription) {
    // Update existing subscription
    await db.update(userSubscriptions)
      .set({
        status: status,
        currentPeriodStart: new Date(current_period_start * 1000),
        currentPeriodEnd: new Date(current_period_end * 1000),
        cancelAtPeriodEnd: cancel_at_period_end,
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.dodoSubscriptionId, subscription_id));

    console.log('Updated existing subscription:', subscription_id);
  } else {
    // Create new subscription
    await db.insert(userSubscriptions).values({
      userId: user.id,
      planId: plan.id,
      status: status,
      currentPeriodStart: new Date(current_period_start * 1000),
      currentPeriodEnd: new Date(current_period_end * 1000),
      dodoSubscriptionId: subscription_id,
      dodoCustomerId: customer_id,
      cancelAtPeriodEnd: cancel_at_period_end,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('Created new subscription:', subscription_id);
  }
}

// Process payment events
async function handlePaymentEvent(eventData: any) {
  const {
    payment_id,
    subscription_id,
    customer_id,
    customer_email,
    amount,
    currency,
    status,
    payment_method
  } = eventData;

  console.log('Processing payment event:', { payment_id, status, customer_email });

  // Find the user by email
  const user = await db.query.users.findFirst({
    where: eq(users.email, customer_email)
  });

  if (!user) {
    console.error('User not found for email:', customer_email);
    throw new Error('User not found');
  }

  // Find the subscription if this is a subscription payment
  let subscriptionId = null;
  if (subscription_id) {
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.dodoSubscriptionId, subscription_id)
    });
    subscriptionId = subscription?.id || null;
  }

  // Check if payment transaction already exists
  const existingTransaction = await db.query.paymentTransactions.findFirst({
    where: eq(paymentTransactions.dodoPaymentId, payment_id)
  });

  if (existingTransaction) {
    // Update existing transaction
    await db.update(paymentTransactions)
      .set({
        status: status,
        updatedAt: new Date()
      })
      .where(eq(paymentTransactions.dodoPaymentId, payment_id));

    console.log('Updated existing payment transaction:', payment_id);
  } else {
    // Create new payment transaction
    await db.insert(paymentTransactions).values({
      userId: user.id,
      subscriptionId: subscriptionId,
      dodoPaymentId: payment_id,
      amount: amount / 100, // Convert from cents to dollars
      currency: currency,
      status: status,
      paymentMethod: payment_method,
      billingPeriod: 'monthly', // Default, can be updated based on subscription
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('Created new payment transaction:', payment_id);
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('webhook-signature') || '';
    const webhookId = request.headers.get('webhook-id') || '';
    const timestamp = request.headers.get('webhook-timestamp') || '';

    console.log('Received webhook:', {
      webhookId,
      timestamp,
      signature: signature.substring(0, 20) + '...',
      bodyLength: rawBody.length
    });

    // Verify webhook signature
    const webhookSecret = process.env.DODO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('DODO_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    const payload = JSON.parse(rawBody);
    console.log('Webhook payload type:', payload.type);

    // Store webhook event for audit trail
    await db.insert(webhookEvents).values({
      dodoEventId: webhookId,
      eventType: payload.type,
      eventData: payload,
      processed: false,
      createdAt: new Date()
    });

    // Process different event types
    switch (payload.type) {
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.cancelled':
      case 'subscription.activated':
        await handleSubscriptionEvent(payload.data);
        break;

      case 'payment.succeeded':
      case 'payment.failed':
      case 'payment.refunded':
        await handlePaymentEvent(payload.data);
        break;

      default:
        console.log('Unhandled webhook event type:', payload.type);
    }

    // Mark webhook as processed
    await db.update(webhookEvents)
      .set({
        processed: true,
        processedAt: new Date()
      })
      .where(eq(webhookEvents.dodoEventId, webhookId));

    return NextResponse.json(
      { message: 'Webhook processed successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);

    // Mark webhook as failed
    const webhookId = request.headers.get('webhook-id');
    if (webhookId) {
      await db.update(webhookEvents)
        .set({
          processed: false,
          processingError: error instanceof Error ? error.message : 'Unknown error',
          processedAt: new Date()
        })
        .where(eq(webhookEvents.dodoEventId, webhookId));
    }

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    );
  }
}

// Handle GET requests for webhook testing
export async function GET() {
  return NextResponse.json(
    { 
      message: 'Dodo webhook endpoint is active',
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  );
} 