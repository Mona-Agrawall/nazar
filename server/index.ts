import express from 'express';
import path from 'path';
import app from './app.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

/** Local entry point: serves the API plus the frontend (Vite in development, built files in production). */
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Nazar] Server running on http://localhost:${PORT}`);
    console.log(
      `[Nazar] Gemini AI: ${process.env.GEMINI_API_KEY ? 'ready' : 'unavailable (deterministic fallback active)'}`,
    );
  });
}

start().catch(console.error);
