import { Hono } from 'hono';
import Stripe from 'stripe';

interface Env {
  STRIPE_API_KEY: string;
}

const checkout = new Hono<{ Bindings: Env }>();

checkout.post('/api/checkout', async (c) => {
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

export default checkout;