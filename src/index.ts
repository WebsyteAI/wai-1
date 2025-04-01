import { Hono } from 'hono';

const app = new Hono();

// Endpoint to get a random joke
app.get('/joke', (c) => {
  const jokes = [
    "Why don't scientists trust atoms? Because they make up everything!",
    "Why did the scarecrow win an award? Because he was outstanding in his field!",
    "Why don't skeletons fight each other? They don't have the guts."
  ];

  const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];

  return c.json({ joke: randomJoke });
});

// Default route
app.get('/', (c) => {
  return c.text('Welcome to the Jokes API! Use the /joke endpoint to get a random joke.');
});

export default app;