'use client'

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Check, Sparkles, Zap, Crown } from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
  productId: string;
  isPopular?: boolean;
  isUnlimited?: boolean;
}

const defaultPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'free',
    displayName: 'Free',
    description: 'Perfect for getting started',
    price: 0,
    currency: 'USD',
    features: [
      '10 AI-generated images per month',
      '1 custom model training',
      'Basic support',
      'Standard resolution outputs'
    ],
    productId: 'prod_free_tier'
  },
  {
    id: 'pro',
    name: 'pro',
    displayName: 'Pro',
    description: 'For creators and professionals',
    price: 20,
    currency: 'USD',
    features: [
      '100 AI-generated images per month',
      '5 custom model trainings',
      'Priority support',
      'High resolution outputs',
      'Advanced editing tools',
      'Commercial usage rights'
    ],
    productId: 'pdt_TjB5s0f7ug3sV1cG41uaX',
    isPopular: true
  },
  {
    id: 'enterprise',
    name: 'enterprise',
    displayName: 'Enterprise',
    description: 'For teams and large-scale projects',
    price: 50,
    currency: 'USD',
    features: [
      'Unlimited AI-generated images',
      'Unlimited custom model trainings',
      '24/7 dedicated support',
      '4K resolution outputs',
      'Advanced editing tools',
      'Commercial usage rights',
      'API access',
      'Custom integrations'
    ],
    productId: 'pdt_CMqQUDwjosU9BnHcNPUdO',
    isUnlimited: true
  }
];

export default function PricingCards() {
  const { user, isSignedIn } = useUser();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>(defaultPlans);

  const handleSubscribe = async (plan: PricingPlan) => {
    if (!isSignedIn) {
      // Redirect to sign in
      window.location.href = '/sign-in';
      return;
    }

    setLoading(plan.id);
    setError(null);

    try {
      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: plan.productId,
          returnUrl: `${window.location.origin}/dashboard`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subscription');
      }

      // Redirect to payment link if available
      if (data.subscription.paymentLink) {
        window.location.href = data.subscription.paymentLink;
      } else {
        // Redirect to dashboard
        window.location.href = '/dashboard';
      }

    } catch (error) {
      console.error('Error creating subscription:', error);
      setError(error instanceof Error ? error.message : 'Failed to create subscription. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'free':
        return <Sparkles className="w-6 h-6" />;
      case 'pro':
        return <Zap className="w-6 h-6" />;
      case 'enterprise':
        return <Crown className="w-6 h-6" />;
      default:
        return <Sparkles className="w-6 h-6" />;
    }
  };

  return (
    <div className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Start with our free tier and upgrade as you grow. All plans include our core AI features.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-6xl mx-auto mb-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-8 transition-all duration-200 hover:shadow-lg ${
                plan.isPopular
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg scale-105'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  <div className={`p-3 rounded-full ${
                    plan.isPopular 
                      ? 'bg-blue-100 dark:bg-blue-800' 
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    {getPlanIcon(plan.name)}
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.displayName}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {plan.description}
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    ${plan.price}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">/month</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleSubscribe(plan)}
                disabled={loading === plan.id}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors duration-200 ${
                  plan.isPopular
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : plan.price === 0
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white'
                    : 'bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plan.id ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : plan.price === 0 ? (
                  'Get Started Free'
                ) : (
                  'Subscribe Now'
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            All plans include a 30-day money-back guarantee. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
} 