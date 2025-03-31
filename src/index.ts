import { Hono } from 'hono';
import { nanoid } from 'nanoid';

interface Cat {
  id: string;
  name: string;
  age: number;
  breed: string;
}

const app = new Hono();
const cats: Record<string, Cat> = {};

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', uptime: process.uptime() });
});

// Get all cats
app.get('/cats', (c) => {
  return c.json(Object.values(cats));
});

// Get a single cat by ID
app.get('/cats/:id', (c) => {
  const id = c.req.param('id');
  const cat = cats[id];
  if (!cat) {
    return c.json({ error: 'Cat not found' }, 404);
  }
  return c.json(cat);
});

// Create a new cat
app.post('/cats', async (c) => {
  const body = await c.req.json();
  const id = nanoid();
  const newCat: Cat = { id, ...body };
  cats[id] = newCat;
  return c.json(newCat, 201);
});

// Update a cat by ID
app.put('/cats/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  if (!cats[id]) {
    return c.json({ error: 'Cat not found' }, 404);
  }
  cats[id] = { ...cats[id], ...body };
  return c.json(cats[id]);
});

// Delete a cat by ID
app.delete('/cats/:id', (c) => {
  const id = c.req.param('id');
  if (!cats[id]) {
    return c.json({ error: 'Cat not found' }, 404);
  }
  delete cats[id];
  return c.json({ message: 'Cat deleted successfully' });
});

export default app;