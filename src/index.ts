import { Hono } from 'hono';
import { OpenAI } from 'openai';

interface Env {
  OPENAI_API_KEY: string;
  PRODIGI_API_KEY: string;
  STRIPE_API_KEY: string;
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

// Placeholder for Stripe Payment Integration
app.post('/api/checkout', async (c) => {
  const { productId, imageUrl, customerEmail } = await c.req.json();

  // TODO: Implement Stripe payment and order creation
  return c.json({ message: 'Checkout endpoint is under construction' });
});

export default app;