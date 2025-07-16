import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/configs/db';
import { 
  paymentTransactions, 
  userSubscriptions, 
  users 
} from '@/configs/schema';
import { eq, and, desc } from 'drizzle-orm';
import { formatCurrency } from '@/lib/utils/subscription';

// GET /api/subscription/billing - Get billing history
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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

    // Get payment transactions
    const transactions = await db.query.paymentTransactions.findMany({
      where: eq(paymentTransactions.userId, user.id),
      orderBy: (paymentTransactions, { desc }) => [desc(paymentTransactions.createdAt)]
    });

    // Get subscription history
    const subscriptions = await db.query.userSubscriptions.findMany({
      where: eq(userSubscriptions.userId, user.id),
      orderBy: (userSubscriptions, { desc }) => [desc(userSubscriptions.createdAt)]
    });

    // Format transactions
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      dodoPaymentId: transaction.dodoPaymentId,
      amount: transaction.amount,
      formattedAmount: formatCurrency(transaction.amount, transaction.currency),
      currency: transaction.currency,
      status: transaction.status,
      paymentMethod: transaction.paymentMethod,
      billingPeriod: transaction.billingPeriod,
      failureReason: transaction.failureReason,
      refundedAt: transaction.refundedAt,
      createdAt: transaction.createdAt
    }));

    // Format subscriptions
    const formattedSubscriptions = subscriptions.map(subscription => ({
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialStart: subscription.trialStart,
      trialEnd: subscription.trialEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      cancelledAt: subscription.cancelledAt,
      createdAt: subscription.createdAt
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      subscriptions: formattedSubscriptions,
      totalSpent: transactions
        .filter(t => t.status === 'succeeded')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      formattedTotalSpent: formatCurrency(
        transactions
          .filter(t => t.status === 'succeeded')
          .reduce((sum, t) => sum + Number(t.amount), 0),
        'USD'
      )
    });

  } catch (error) {
    console.error('Error getting billing history:', error);
    return NextResponse.json(
      { error: 'Failed to get billing history' },
      { status: 500 }
    );
  }
} 