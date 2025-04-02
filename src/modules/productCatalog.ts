import { Hono } from 'hono';

interface Env {
  PRODIGI_API_KEY: string;
}

const productCatalog = new Hono<{ Bindings: Env }>();

productCatalog.get('/api/products', async (c) => {
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

export default productCatalog;