import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/configs/db';
import { users, subscriptionPlans, userSubscriptions } from '@/configs/schema';
import { eq } from 'drizzle-orm';

const DODO_API_BASE_URL = process.env.DODO_API_BASE_URL || 'https://test.dodopayments.com';
const DODO_API_KEY = process.env.DODO_PAYMENTS_API_KEY;

if (!DODO_API_KEY) {
  throw new Error('DODO_PAYMENTS_API_KEY environment variable is required');
}

interface CreateSubscriptionRequest {
  product_id: string;
  quantity: number;
  customer: {
    customer_id?: string;
    name?: string;
    email?: string;
  };
  billing: {
    city: string;
    country: string;
    state: string;
    street: string;
    zipcode: string;
  };
  payment_link?: boolean;
  return_url?: string;
  metadata?: Record<string, string>;
}

interface CreateSubscriptionResponse {
  subscription_id: string;
  payment_id: string;
  payment_link?: string;
  recurring_pre_tax_amount: number;
  customer: {
    customer_id: string;
    name: string;
    email: string;
  };
  metadata: Record<string, string>;
  addons: any[];
}

// POST /api/subscription/create - Create a subscription using Dodo Payments
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, billingAddress, returnUrl } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId)
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get subscription plan by product ID
    let plan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.dodoPlanId, productId)
    });

    // If plan doesn't exist in database, create a default plan based on product ID
    if (!plan) {
      let defaultPlan = {
        id: 0,
        name: 'unknown',
        displayName: 'Unknown Plan',
        price: 0,
        currency: 'USD',
        dodoPlanId: productId
      };

      // Set default values based on product ID
      if (productId === 'pdt_TjB5s0f7ug3sV1cG41uaX') {
        defaultPlan = {
          id: 0,
          name: 'pro',
          displayName: 'Pro',
          price: 20,
          currency: 'USD',
          dodoPlanId: productId
        };
      } else if (productId === 'pdt_CMqQUDwjosU9BnHcNPUdO') {
        defaultPlan = {
          id: 0,
          name: 'enterprise',
          displayName: 'Enterprise',
          price: 50,
          currency: 'USD',
          dodoPlanId: productId
        };
      }

      plan = defaultPlan;
    }

    // Prepare subscription request
    const subscriptionRequest: CreateSubscriptionRequest = {
      product_id: productId,
      quantity: 1,
      customer: {
        name: user.name,
        email: user.email,
      },
      billing: billingAddress || {
        city: 'Default City',
        country: 'US',
        state: 'Default State',
        street: 'Default Street',
        zipcode: '12345'
      },
      payment_link: true,
      return_url: returnUrl || `${request.nextUrl.origin}/dashboard`,
      metadata: {
        user_id: user.id.toString(),
        plan_name: plan.name,
        plan_display_name: plan.displayName
      }
    };

    // Create subscription in Dodo Payments
    const response = await fetch(`${DODO_API_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DODO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dodo Payments API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to create subscription in Dodo Payments' },
        { status: response.status }
      );
    }

    const subscriptionData: CreateSubscriptionResponse = await response.json();

    // Create subscription record in our database
    let subscription;
    
    if (plan.id === 0) {
      // Using default plan, don't create database record yet
      subscription = [{
        id: 0,
        userId: user.id,
        planId: 0,
        status: 'pending',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        dodoSubscriptionId: subscriptionData.subscription_id,
        dodoCustomerId: subscriptionData.customer.customer_id,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }];
    } else {
      // Plan exists in database, create subscription record
      subscription = await db.insert(userSubscriptions).values({
        userId: user.id,
        planId: plan.id,
        status: 'pending', // Will be updated via webhook
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        dodoSubscriptionId: subscriptionData.subscription_id,
        dodoCustomerId: subscriptionData.customer.customer_id,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
    }

    return NextResponse.json({
      message: 'Subscription created successfully',
      subscription: {
        id: subscription[0].id,
        dodoSubscriptionId: subscriptionData.subscription_id,
        paymentId: subscriptionData.payment_id,
        paymentLink: subscriptionData.payment_link,
        amount: subscriptionData.recurring_pre_tax_amount,
        customer: subscriptionData.customer,
        plan: {
          id: plan.id,
          name: plan.name,
          displayName: plan.displayName,
          price: plan.price,
          currency: plan.currency
        }
      }
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
} 