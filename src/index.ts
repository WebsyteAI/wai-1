import { Hono } from 'hono';

const app = new Hono();

// Default route
app.get('/', (c) => {
  return c.text('Hello, World!');
});

export default app;