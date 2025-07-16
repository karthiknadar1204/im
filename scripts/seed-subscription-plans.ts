import { db } from '../configs/db';
import { subscriptionPlans } from '../configs/schema';

async function seedSubscriptionPlans() {
  try {
    console.log('🌱 Seeding subscription plans...');

    const plans = [
      {
        name: 'free',
        displayName: 'Free',
        description: 'Perfect for getting started. 100 images and 1 model training for your first month.',
        price: 0.00,
        currency: 'USD',
        billingCycle: 'monthly',
        imageGenerationLimit: 100,
        modelTrainingLimit: 1,
        features: {
          prioritySupport: false,
          advancedFeatures: false,
          apiAccess: false
        },
        dodoPlanId: null
      },
      {
        name: 'pro',
        displayName: 'Pro',
        description: 'For power users. 300 images and 3 model trainings per month.',
        price: 20.00,
        currency: 'USD',
        billingCycle: 'monthly',
        imageGenerationLimit: 300,
        modelTrainingLimit: 3,
        features: {
          prioritySupport: true,
          advancedFeatures: true,
          apiAccess: false
        },
        dodoPlanId: 'pdt_TjB5s0f7ug3sV1cG41uaX'
      },
      {
        name: 'enterprise',
        displayName: 'Enterprise',
        description: 'For teams and businesses. Unlimited images and 5 model trainings per month.',
        price: 50.00,
        currency: 'USD',
        billingCycle: 'monthly',
        imageGenerationLimit: null, // unlimited
        modelTrainingLimit: 5,
        features: {
          prioritySupport: true,
          advancedFeatures: true,
          apiAccess: true,
          teamManagement: true
        },
        dodoPlanId: 'pdt_CMqQUDwjosU9BnHcNPUdO'
      }
    ];

    for (const plan of plans) {
      await db.insert(subscriptionPlans).values(plan)
        .onConflictDoUpdate({
          target: subscriptionPlans.name,
          set: {
            displayName: plan.displayName,
            description: plan.description,
            price: plan.price,
            imageGenerationLimit: plan.imageGenerationLimit,
            modelTrainingLimit: plan.modelTrainingLimit,
            features: plan.features,
            dodoPlanId: plan.dodoPlanId,
            updatedAt: new Date()
          }
        });
      
      console.log(`✅ Added/Updated plan: ${plan.displayName}`);
    }

    console.log('🎉 Subscription plans seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding subscription plans:', error);
    throw error;
  }
}

// Run the seed function
seedSubscriptionPlans()
  .then(() => {
    console.log('✅ Seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }); 