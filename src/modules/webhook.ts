import { Hono } from 'hono';
import Stripe from 'stripe';

interface Env {
  STRIPE_API_KEY: string;
  PRODIGI_API_KEY: string;
  SENDGRID_API_KEY: string;
}

const webhook = new Hono<{ Bindings: Env }>();

webhook.post('/api/webhook', async (c) => {
  const stripe = new Stripe(c.env.STRIPE_API_KEY, { apiVersion: '2022-11-15' });
  const signature = c.req.header('Stripe-Signature');
  const payload = await c.req.text();

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature!,
      '<YOUR_STRIPE_WEBHOOK_SECRET>' // Replace with your webhook secret
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Place order via Prodigi API
      const orderResponse = await fetch('https://api.prodigi.com/v4.0/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${c.env.PRODIGI_API_KEY}`,
        },
        body: JSON.stringify({
          shippingMethod: 'Standard',
          recipient: {
            name: session.customer_details?.name,
            email: session.customer_email,
            address: {
              line1: session.shipping?.address.line1,
              line2: session.shipping?.address.line2,
              city: session.shipping?.address.city,
              postalOrZipCode: session.shipping?.address.postal_code,
              stateOrCounty: session.shipping?.address.state,
              countryCode: session.shipping?.address.country,
            },
          },
          items: [
            {
              sku: session.metadata?.productId,
              copies: 1,
              assets: [
                {
                  printArea: 'default',
                  url: session.metadata?.imageUrl,
                },
              ],
            },
          ],
        }),
      });

      if (!orderResponse.ok) {
        throw new Error(`Prodigi order creation failed: ${orderResponse.status}`);
      }

      const orderData = await orderResponse.json();
      console.log('Order placed successfully:', orderData);

      // Send email notification
      const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${c.env.SENDGRID_API_KEY}`,
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: session.customer_email }],
              subject: 'Your Order Confirmation',
            },
          ],
          from: { email: 'no-reply@yourdomain.com', name: 'Your Store' },
          content: [
            {
              type: 'text/plain',
              value: `Thank you for your order! Your order ID is ${orderData.id}. We will notify you once it ships.`,
            },
          ],
        }),
      });

      if (!emailResponse.ok) {
        throw new Error(`Failed to send email: ${emailResponse.status}`);
      }

      console.log('Email sent successfully');
    }

    return c.text('Webhook received', 200);
  } catch (error) {
    console.error('Error verifying webhook or processing order:', error);
    return c.text('Webhook verification failed', 400);
  }
});

export default webhook;