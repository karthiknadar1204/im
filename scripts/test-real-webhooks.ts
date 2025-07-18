#!/usr/bin/env tsx

import crypto from 'crypto';

const WEBHOOK_URL = 'https://effd5546bcfa.ngrok-free.app/api/webhook/dodo';
const WEBHOOK_SECRET = 'whsec_bnAzR98GRrjtwZf3pUZek0Yf';

interface WebhookEvent {
  type: string;
  data: any;
}

class RealWebhookTester {
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async sendWebhook(event: WebhookEvent): Promise<any> {
    const webhookId = this.generateId('wh_real');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    const payloadString = JSON.stringify(event);
    
    // Generate webhook signature
    const signature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payloadString, 'utf8')
      .digest('hex');

    console.log(`📤 Sending webhook: ${event.type}`);
    console.log(`📊 Webhook ID: ${webhookId}`);
    console.log(`📊 Payload: ${JSON.stringify(event, null, 2)}`);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'webhook-id': webhookId,
          'webhook-signature': signature,
          'webhook-timestamp': timestamp,
        },
        body: payloadString,
      });

      const responseText = await response.text();
      
      if (response.ok) {
        console.log('✅ Webhook sent successfully');
        console.log(`📊 Response: ${responseText}`);
        return { success: true, response: responseText };
      } else {
        console.log('❌ Webhook failed');
        console.log(`📊 Status: ${response.status}`);
        console.log(`📊 Response: ${responseText}`);
        return { success: false, error: responseText };
      }
    } catch (error) {
      console.log('❌ Webhook request failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testSubscriptionCreated(): Promise<any> {
    const event: WebhookEvent = {
      type: 'subscription.created',
      data: {
        subscription_id: this.generateId('sub_real'),
        customer_id: this.generateId('cus_real'),
        customer_email: 'karthiknadar1204@gmail.com',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
        product_id: 'pdt_TjB5s0f7ug3sV1cG41uaX', // Pro plan
        cancel_at_period_end: false
      }
    };

    return this.sendWebhook(event);
  }

  async testPaymentSucceeded(): Promise<any> {
    const event: WebhookEvent = {
      type: 'payment.succeeded',
      data: {
        payment_id: this.generateId('pay_real'),
        subscription_id: this.generateId('sub_real'),
        customer_id: this.generateId('cus_real'),
        customer_email: 'karthiknadar1204@gmail.com',
        amount: 2000, // $20.00 in cents
        currency: 'USD',
        status: 'succeeded',
        payment_method: 'card'
      }
    };

    return this.sendWebhook(event);
  }

  async testPaymentFailed(): Promise<any> {
    const event: WebhookEvent = {
      type: 'payment.failed',
      data: {
        payment_id: this.generateId('pay_real'),
        subscription_id: this.generateId('sub_real'),
        customer_id: this.generateId('cus_real'),
        customer_email: 'karthiknadar1204@gmail.com',
        amount: 2000, // $20.00 in cents
        currency: 'USD',
        status: 'failed',
        payment_method: 'card',
        failure_reason: 'insufficient_funds'
      }
    };

    return this.sendWebhook(event);
  }

  async testSubscriptionCancelled(): Promise<any> {
    const event: WebhookEvent = {
      type: 'subscription.cancelled',
      data: {
        subscription_id: this.generateId('sub_real'),
        customer_id: this.generateId('cus_real'),
        customer_email: 'karthiknadar1204@gmail.com',
        status: 'cancelled',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
        product_id: 'pdt_TjB5s0f7ug3sV1cG41uaX',
        cancel_at_period_end: true
      }
    };

    return this.sendWebhook(event);
  }

  async testPaymentRefunded(): Promise<any> {
    const event: WebhookEvent = {
      type: 'payment.refunded',
      data: {
        payment_id: this.generateId('pay_real'),
        subscription_id: this.generateId('sub_real'),
        customer_id: this.generateId('cus_real'),
        customer_email: 'karthiknadar1204@gmail.com',
        amount: 2000, // $20.00 in cents
        currency: 'USD',
        status: 'refunded',
        payment_method: 'card',
        refund_reason: 'customer_request'
      }
    };

    return this.sendWebhook(event);
  }

  async runAllTests(): Promise<void> {
    console.log('🎭 Starting Real Webhook Tests...\n');
    console.log(`🌐 Webhook URL: ${WEBHOOK_URL}\n`);

    const tests = [
      { name: 'Subscription Created', test: () => this.testSubscriptionCreated() },
      { name: 'Payment Succeeded', test: () => this.testPaymentSucceeded() },
      { name: 'Payment Failed', test: () => this.testPaymentFailed() },
      { name: 'Subscription Cancelled', test: () => this.testSubscriptionCancelled() },
      { name: 'Payment Refunded', test: () => this.testPaymentRefunded() }
    ];

    for (const test of tests) {
      console.log(`\n📋 Testing: ${test.name}`);
      console.log('=' .repeat(50));
      
      try {
        const result = await test.test();
        if (result.success) {
          console.log(`✅ ${test.name} - SUCCESS`);
        } else {
          console.log(`❌ ${test.name} - FAILED: ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ ${test.name} - ERROR: ${error.message}`);
      }
      
      // Wait 2 seconds between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n🏁 Real webhook tests completed!');
    console.log('\n📝 Next Steps:');
    console.log('1. Check your Dodo Payments dashboard for webhook events');
    console.log('2. Look for webhook delivery logs');
    console.log('3. Verify webhook signatures and processing');
  }
}

// CLI interface
async function main() {
  const tester = new RealWebhookTester();
  
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'subscription':
      await tester.testSubscriptionCreated();
      break;
    case 'payment':
      await tester.testPaymentSucceeded();
      break;
    case 'failed':
      await tester.testPaymentFailed();
      break;
    case 'cancel':
      await tester.testSubscriptionCancelled();
      break;
    case 'refund':
      await tester.testPaymentRefunded();
      break;
    case 'all':
      await tester.runAllTests();
      break;
    default:
      console.log(`
🎭 Real Webhook Tester

Usage:
  npm run real-webhook subscription
  npm run real-webhook payment
  npm run real-webhook failed
  npm run real-webhook cancel
  npm run real-webhook refund
  npm run real-webhook all

Examples:
  npm run real-webhook subscription  # Test subscription.created
  npm run real-webhook payment       # Test payment.succeeded
  npm run real-webhook all          # Run all webhook tests
      `);
  }
}

// Run the tester
if (require.main === module) {
  main().catch(console.error);
}

export { RealWebhookTester }; 