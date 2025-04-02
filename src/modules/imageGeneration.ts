import { Hono } from 'hono';
import { OpenAI } from 'openai';

interface Env {
  OPENAI_API_KEY: string;
}

const imageGeneration = new Hono<{ Bindings: Env }>();

imageGeneration.post('/api/generate-image', async (c) => {
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

export default imageGeneration;