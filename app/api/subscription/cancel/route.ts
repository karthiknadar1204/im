import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/configs/db';
import { userSubscriptions, users } from '@/configs/schema';
import { eq, and } from 'drizzle-orm';

// POST /api/subscription/cancel - Cancel current subscription
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
    const { cancelAtPeriodEnd = true } = body;

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

    // Get current active subscription
    const subscription = await db.query.userSubscriptions.findFirst({
      where: and(
        eq(userSubscriptions.userId, user.id),
        eq(userSubscriptions.status, 'active')
      )
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Don't allow cancellation of free tier
    if (!subscription.dodoSubscriptionId) {
      return NextResponse.json(
        { error: 'Cannot cancel free tier subscription' },
        { status: 400 }
      );
    }

    // Import Dodo functions
    const { cancelUserSubscription } = await import('@/lib/utils/dodo-payments');

    // Cancel subscription in Dodo and update our database
    const updatedSubscription = await cancelUserSubscription(user.id, cancelAtPeriodEnd);

    return NextResponse.json({
      message: cancelAtPeriodEnd 
        ? 'Subscription will be cancelled at the end of the current period'
        : 'Subscription cancelled immediately',
      subscription: updatedSubscription
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
} 