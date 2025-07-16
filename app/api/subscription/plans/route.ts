import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { subscriptionPlans } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import { getPlanFeaturesList, formatCurrency } from '@/lib/utils/subscription';

// GET /api/subscription/plans - Get available subscription plans
export async function GET(request: NextRequest) {
  try {
    // Get all active subscription plans
    const plans = await db.query.subscriptionPlans.findMany({
      where: eq(subscriptionPlans.isActive, true),
      orderBy: (subscriptionPlans, { asc }) => [asc(subscriptionPlans.price)]
    });

    // Format plans for frontend
    const formattedPlans = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description,
      price: plan.price,
      formattedPrice: formatCurrency(plan.price, plan.currency),
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      imageGenerationLimit: plan.imageGenerationLimit,
      modelTrainingLimit: plan.modelTrainingLimit,
      features: plan.features,
      featuresList: getPlanFeaturesList(plan),
      isPopular: plan.name === 'pro', // Mark Pro as popular
      isUnlimited: plan.imageGenerationLimit === null
    }));

    return NextResponse.json({
      plans: formattedPlans,
      currentPeriod: {
        start: new Date(),
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    });

  } catch (error) {
    console.error('Error getting subscription plans:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription plans' },
      { status: 500 }
    );
  }
} 