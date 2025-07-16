#!/usr/bin/env tsx

import { runCoreTests } from './test-payment-core';

console.log('🧪 Payment Gateway Test Suite');
console.log('==============================\n');

// Check if required environment variables are set
const requiredEnvVars = [
  'DODO_WEBHOOK_SECRET',
  'NEXT_PUBLIC_APP_URL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log('⚠️  Warning: Some environment variables are not set:');
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('\n📝 You can set them in your .env.local file:');
  console.log('   DODO_WEBHOOK_SECRET=your_webhook_secret');
  console.log('   NEXT_PUBLIC_APP_URL=http://localhost:3000');
  console.log('\n🔄 Continuing with default values...\n');
}

// Run the core tests
runCoreTests()
  .then(() => {
    console.log('\n🎉 All tests passed!');
    console.log('\n📋 What was tested:');
    console.log('✅ Database schema and tables');
    console.log('✅ Subscription plan creation and retrieval');
    console.log('✅ User subscription management');
    console.log('✅ Usage tracking and incrementing');
    console.log('✅ Payment transaction recording');
    console.log('✅ Webhook processing and signature verification');
    console.log('✅ Database state verification');
    console.log('✅ Subscription cancellation');
    
    console.log('\n🚀 Your payment gateway is ready for production!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Tests failed:', error);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Make sure your database is running and accessible');
    console.log('2. Check that all migrations have been applied');
    console.log('3. Verify your environment variables are set correctly');
    console.log('4. Ensure your Next.js app is running on the correct URL');
    process.exit(1);
  }); 