import { Hono } from 'hono';

const app = new Hono();

// Endpoint to fetch data from example.com/api
app.get('/fetch-example', async (c) => {
  try {
    const response = await fetch('https://example.com/api');
    const data = await response.json();

    return c.json({
      message: 'Data fetched successfully!',
      data,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return c.json({
      message: 'Failed to fetch data.',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Default route
app.get('/', (c) => {
  return c.text('Welcome! Use the /fetch-example endpoint to fetch data from example.com/api.');
});

export default app;