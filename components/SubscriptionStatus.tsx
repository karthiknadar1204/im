"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Crown, 
  Image, 
  Brain, 
  AlertTriangle, 
  CheckCircle,
  ExternalLink 
} from 'lucide-react';

interface SubscriptionData {
  subscription: {
    plan: {
      name: string;
      displayName: string;
      price: number;
      currency: string;
    };
    status: string;
    currentPeriodEnd: string;
  };
  usage: {
    imagesGeneratedCount: number;
    modelsTrainedCount: number;
    imageGenerationLimit: number | null;
    modelTrainingLimit: number | null;
  };
  remainingImages: number | null;
  remainingModels: number | null;
}

export function SubscriptionStatus() {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscription');
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }
      
      const data = await response.json();
      setSubscriptionData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load subscription status: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!subscriptionData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No subscription found. You're currently on the free tier.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { subscription, usage, remainingImages, remainingModels } = subscriptionData;
  const isActive = subscription.status === 'active';
  const isFreeTier = subscription.plan.name === 'free';

  // Calculate usage percentages
  const imageUsagePercent = usage.imageGenerationLimit 
    ? (usage.imagesGeneratedCount / usage.imageGenerationLimit) * 100 
    : 0;
  
  const modelUsagePercent = usage.modelTrainingLimit 
    ? (usage.modelsTrainedCount / usage.modelTrainingLimit) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isFreeTier ? 'Free Plan' : <Crown className="h-5 w-5 text-yellow-500" />}
              {subscription.plan.displayName}
            </CardTitle>
            <CardDescription>
              {isActive ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  {subscription.status}
                </span>
              )}
            </CardDescription>
          </div>
          <Badge variant={isActive ? "default" : "secondary"}>
            ${subscription.plan.price}/{subscription.plan.currency === 'USD' ? 'month' : subscription.plan.currency}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image Generation Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              <span className="text-sm font-medium">Image Generation</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {usage.imagesGeneratedCount} / {usage.imageGenerationLimit || '∞'}
            </span>
          </div>
          {usage.imageGenerationLimit && (
            <Progress value={imageUsagePercent} className="h-2" />
          )}
          {remainingImages !== null && remainingImages <= 5 && (
            <Alert variant="warning" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Only {remainingImages} images remaining this month
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Model Training Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="text-sm font-medium">Model Training</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {usage.modelsTrainedCount} / {usage.modelTrainingLimit || '∞'}
            </span>
          </div>
          {usage.modelTrainingLimit && (
            <Progress value={modelUsagePercent} className="h-2" />
          )}
          {remainingModels !== null && remainingModels <= 1 && (
            <Alert variant="warning" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Only {remainingModels} model training remaining this month
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open('/dashboard/billing', '_blank')}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Manage Billing
          </Button>
          {isFreeTier && (
            <Button 
              size="sm" 
              onClick={() => window.open('/dashboard/billing', '_blank')}
              className="flex-1"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade
            </Button>
          )}
        </div>

        {/* Renewal Info */}
        {isActive && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 