import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { 
  webhookEvents, 
  userSubscriptions, 
  paymentTransactions, 
  users,
  subscriptionPlans,
  usageTracking
} from '@/configs/schema';
import { eq, and, gte, lte, or } from 'drizzle-orm';
import { Webhook } from "standardwebhooks";

// Process subscription events
async function handleSubscriptionEvent(eventData: any) {
  const {
    subscription_id,
    status,
    product_id,
    customer,
    next_billing_date,
    previous_billing_date,
    cancel_at_next_billing_date,
    metadata
  } = eventData;

  // Extract customer information from nested customer object
  const customer_id = customer?.customer_id;
  const customer_email = customer?.email;

  console.log('Processing subscription event:', { subscription_id, status, customer_email, customer_id });

  // Find the user - try email first, then customer_id
  let user = null;
  
  if (customer_email) {
    user = await db.query.users.findFirst({
      where: eq(users.email, customer_email)
    });
  }
  
  // If no user found by email, try to find by customer_id from existing subscription
  if (!user && customer_id) {
    const existingSubscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.dodoCustomerId, customer_id)
    });
    
    if (existingSubscription) {
      user = await db.query.users.findFirst({
        where: eq(users.id, existingSubscription.userId)
      });
    }
  }

  if (!user) {
    console.error('User not found for subscription:', { customer_email, customer_id, subscription_id });
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
        currentPeriodStart: new Date(previous_billing_date),
        currentPeriodEnd: new Date(next_billing_date),
        cancelAtPeriodEnd: cancel_at_next_billing_date || false,
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.dodoSubscriptionId, subscription_id));

    console.log('Updated existing subscription:', subscription_id);
    
    // Create usage tracking for the billing period
    const billingPeriodStart = new Date(previous_billing_date);
    const billingPeriodEnd = new Date(next_billing_date);
    
    console.log('Creating usage tracking for subscription:', {
      userId: user.id,
      subscriptionId: existingSubscription.id,
      billingPeriodStart: billingPeriodStart.toISOString(),
      billingPeriodEnd: billingPeriodEnd.toISOString()
    });
    
    try {
      await db.insert(usageTracking).values({
        userId: user.id,
        subscriptionId: existingSubscription.id,
        periodStart: billingPeriodStart,
        periodEnd: billingPeriodEnd,
        imagesGeneratedCount: 0,
        modelsTrainedCount: 0,
        imageGenerationLimit: plan.imageGenerationLimit,
        modelTrainingLimit: plan.modelTrainingLimit,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created usage tracking for existing subscription:', subscription_id);
    } catch (usageInsertError) {
      // Handle case where usage tracking already exists (unique constraint violation)
      if (usageInsertError instanceof Error && usageInsertError.message.includes('duplicate key')) {
        console.log('Usage tracking already exists for this billing period:', subscription_id);
      } else {
        throw usageInsertError;
      }
    }
  } else {
    // Create new subscription - use upsert to handle race conditions
    try {
      const newSubscription = await db.insert(userSubscriptions).values({
        userId: user.id,
        planId: plan.id,
        status: status,
        currentPeriodStart: new Date(previous_billing_date),
        currentPeriodEnd: new Date(next_billing_date),
        dodoSubscriptionId: subscription_id,
        dodoCustomerId: customer_id,
        cancelAtPeriodEnd: cancel_at_next_billing_date || false,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      console.log('Created new subscription:', subscription_id);
      
      // Create usage tracking for new subscription
      const billingPeriodStart = new Date(previous_billing_date);
      const billingPeriodEnd = new Date(next_billing_date);
      
      try {
        await db.insert(usageTracking).values({
          userId: user.id,
          subscriptionId: newSubscription[0].id,
          periodStart: billingPeriodStart,
          periodEnd: billingPeriodEnd,
          imagesGeneratedCount: 0,
          modelsTrainedCount: 0,
          imageGenerationLimit: plan.imageGenerationLimit,
          modelTrainingLimit: plan.modelTrainingLimit,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log('Created usage tracking for new subscription:', subscription_id);
      } catch (usageInsertError) {
        // Handle case where usage tracking already exists (unique constraint violation)
        if (usageInsertError instanceof Error && usageInsertError.message.includes('duplicate key')) {
          console.log('Usage tracking already exists for this billing period:', subscription_id);
        } else {
          throw usageInsertError;
        }
      }
    } catch (insertError) {
      // Handle case where subscription was created by another concurrent webhook
      if (insertError instanceof Error && insertError.message.includes('duplicate key')) {
        console.log('Subscription already exists (concurrent insert), updating instead:', subscription_id);
        
        // Update the existing subscription
        await db.update(userSubscriptions)
          .set({
            status: status,
            currentPeriodStart: new Date(previous_billing_date),
            currentPeriodEnd: new Date(next_billing_date),
            cancelAtPeriodEnd: cancel_at_next_billing_date || false,
            updatedAt: new Date()
          })
          .where(eq(userSubscriptions.dodoSubscriptionId, subscription_id));
        
        console.log('Updated subscription after concurrent insert:', subscription_id);
      } else {
        throw insertError;
      }
    }
  }
}

// Process payment events
async function handlePaymentEvent(eventData: any) {
  const {
    payment_id,
    subscription_id,
    customer_id,
    amount,
    currency,
    status,
    payment_method,
    customer
  } = eventData;

  // Extract customer email from customer object
  const customer_email = customer?.email;

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
    const webhookId = request.headers.get('webhook-id') || '';
    const signature = request.headers.get('webhook-signature') || '';
    const timestamp = request.headers.get('webhook-timestamp') || '';

    console.log('Received webhook:', {
      webhookId,
      timestamp,
      signature: signature.substring(0, 20) + '...',
      bodyLength: rawBody.length
    });

    // Verify webhook signature using standardwebhooks
    const webhookSecret = process.env.NEXT_PUBLIC_DODO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('NEXT_PUBLIC_DODO_WEBHOOK_KEY not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const webhook = new Webhook(webhookSecret);
    
    try {
      const webhookHeaders = {
        "webhook-id": webhookId,
        "webhook-signature": signature,
        "webhook-timestamp": timestamp,
      };
      
      await webhook.verify(rawBody, webhookHeaders);
      console.log('Webhook signature verified successfully');
    } catch (verificationError) {
      console.error('Webhook signature verification failed:', verificationError);
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    const payload = JSON.parse(rawBody);
    console.log('Webhook payload type:', payload.type);
    
    // Log the full payload structure for debugging subscription events
    if (payload.type && payload.type.startsWith('subscription.')) {
      console.log('Subscription event payload structure:', JSON.stringify(payload, null, 2));
    }

    // Check if webhook event already exists to avoid duplicates
    let existingWebhook = await db.query.webhookEvents.findFirst({
      where: eq(webhookEvents.dodoEventId, webhookId)
    });

    if (!existingWebhook) {
      try {
        // Store webhook event for audit trail
        const newWebhook = await db.insert(webhookEvents).values({
          dodoEventId: webhookId,
          eventType: payload.type,
          eventData: payload,
          processed: false,
          createdAt: new Date()
        }).returning();
        
        existingWebhook = newWebhook[0];
        console.log('Created new webhook event:', webhookId);
      } catch (insertError) {
        // Handle case where webhook was inserted by another concurrent request
        if (insertError instanceof Error && insertError.message.includes('duplicate key')) {
          console.log('Webhook event already exists (concurrent insert), fetching existing:', webhookId);
          existingWebhook = await db.query.webhookEvents.findFirst({
            where: eq(webhookEvents.dodoEventId, webhookId)
          });
        } else {
          throw insertError;
        }
      }
    } else {
      console.log('Webhook event already exists, skipping insert:', webhookId);
    }

    // Check if webhook has already been processed successfully
    if (existingWebhook && existingWebhook.processed) {
      console.log('Webhook already processed successfully, skipping:', webhookId);
      return NextResponse.json(
        { message: 'Webhook already processed' },
        { status: 200 }
      );
    }

    // Process different event types
    try {
      console.log('Processing webhook event type:', payload.type, 'for webhook ID:', webhookId);
      
      switch (payload.type) {
        case 'subscription.created':
        case 'subscription.updated':
        case 'subscription.cancelled':
        case 'subscription.activated':
        case 'subscription.renewed':
        case 'subscription.active':
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

      // Mark webhook as processed (only if it exists)
      if (existingWebhook) {
        await db.update(webhookEvents)
          .set({
            processed: true,
            processedAt: new Date()
          })
          .where(eq(webhookEvents.dodoEventId, webhookId));
      }
    } catch (processingError) {
      console.error('Error processing webhook event:', processingError);
      
      // Mark webhook as failed (only if it exists)
      if (existingWebhook) {
        await db.update(webhookEvents)
          .set({
            processed: false,
            processingError: processingError instanceof Error ? processingError.message : 'Unknown error',
            processedAt: new Date()
          })
          .where(eq(webhookEvents.dodoEventId, webhookId));
      }
      
      throw processingError;
    }

    return NextResponse.json(
      { message: 'Webhook processed successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);

    // Mark webhook as failed (only if it exists)
    const webhookId = request.headers.get('webhook-id');
    if (webhookId) {
      const existingWebhook = await db.query.webhookEvents.findFirst({
        where: eq(webhookEvents.dodoEventId, webhookId)
      });
      
      if (existingWebhook) {
        await db.update(webhookEvents)
          .set({
            processed: false,
            processingError: error instanceof Error ? error.message : 'Unknown error',
            processedAt: new Date()
          })
          .where(eq(webhookEvents.dodoEventId, webhookId));
      }
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