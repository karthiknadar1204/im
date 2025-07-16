import crypto from 'crypto';

// Test webhook endpoint
async function testWebhook() {
  const webhookUrl = 'https://132b2a1861b6.ngrok-free.app/api/webhook/dodo';
  const webhookSecret = process.env.DODO_WEBHOOK_SECRET || 'test-secret';

  // Sample webhook payload (subscription.created event)
  const payload = {
    type: 'subscription.created',
    data: {
      subscription_id: 'sub_test_123',
      customer_id: 'cus_test_456',
      customer_email: 'test@example.com',
      status: 'active',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
      product_id: 'pdt_TjB5s0f7ug3sV1cG41uaX', // Pro plan
      cancel_at_period_end: false
    }
  };

  const payloadString = JSON.stringify(payload);
  
  // Generate webhook signature
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payloadString, 'utf8')
    .digest('hex');

  const webhookId = 'wh_test_' + Date.now();
  const timestamp = Math.floor(Date.now() / 1000).toString();

  console.log('Testing webhook endpoint...');
  console.log('URL:', webhookUrl);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('Signature:', signature);

  try {
    const response = await fetch(webhookUrl, {
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
    
    console.log('Response status:', response.status);
    console.log('Response body:', responseText);

    if (response.ok) {
      console.log('✅ Webhook test successful!');
    } else {
      console.log('❌ Webhook test failed!');
    }
  } catch (error) {
    console.error('❌ Webhook test error:', error);
  }
}

// Test GET endpoint
async function testWebhookGet() {
  const webhookUrl = 'https://132b2a1861b6.ngrok-free.app/api/webhook/dodo';

  console.log('\nTesting webhook GET endpoint...');

  try {
    const response = await fetch(webhookUrl, {
      method: 'GET',
    });

    const responseText = await response.text();
    
    console.log('Response status:', response.status);
    console.log('Response body:', responseText);

    if (response.ok) {
      console.log('✅ Webhook GET test successful!');
    } else {
      console.log('❌ Webhook GET test failed!');
    }
  } catch (error) {
    console.error('❌ Webhook GET test error:', error);
  }
}

// Run tests
async function runTests() {
  console.log('🧪 Starting webhook tests...\n');
  
  await testWebhookGet();
  await testWebhook();
  
  console.log('\n🏁 Webhook tests completed!');
}

runTests().catch(console.error); 