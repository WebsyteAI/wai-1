export default {
  async fetch(request) {
    return new Response('Hello, World!', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};