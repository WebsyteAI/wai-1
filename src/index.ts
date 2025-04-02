import { Hono } from 'hono';
import { OpenAI } from 'openai';
import Stripe from 'stripe';

interface Env {
  OPENAI_API_KEY: string;
  PRODIGI_API_KEY: string;
  STRIPE_API_KEY: string;
  SENDGRID_API_KEY: string;
}

const app = new Hono<{ Bindings: Env }>();

// AI Image Generation
app.post('/api/generate-image', async (c) => {
  const { prompt } = await c.req.json<{ prompt: string }>();
  const client = new OpenAI({ apiKey: c.env.OPENAI_API_KEY });

  try {
    const response = await client.images.generate({
      prompt,
      n: 1,
      size: '1024x1024',
    });

    return c.json({ imageUrl: response.data[0].url });
  } catch (error) {
    console.error('Error generating image:', error);
    return c.json({ error: 'Failed to generate image' }, 500);
  }
});

// Fetch Prodigi Product Catalog
app.get('/api/products', async (c) => {
  try {
    const response = await fetch('https://api.prodigi.com/v4.0/products', {
      headers: {
        Authorization: `Bearer ${c.env.PRODIGI_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Prodigi API error: ${response.status}`);
    }

    const products = await response.json();
    return c.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return c.json({ error: 'Failed to fetch products' }, 500);
  }
});

// Create Stripe Checkout Session
app.post('/api/checkout', async (c) => {
  const { productId, imageUrl, customerEmail } = await c.req.json();
  const stripe = new Stripe(c.env.STRIPE_API_KEY, { apiVersion: '2022-11-15' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Custom Product (${productId})`,
              images: [imageUrl],
            },
            unit_amount: 2000, // Example price in cents ($20.00)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://yourdomain.com/cancel',
      customer_email: customerEmail,
    });

    return c.json({ url: session.url });
  } catch (error) {
    console.error('Error creating Stripe session:', error);
    return c.json({ error: 'Failed to create checkout session' }, 500);
  }
});

// Stripe Webhook for Payment Confirmation
app.post('/api/webhook', async (c) => {
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

export default app;