import dotenv from 'dotenv';
import express from 'express';
import { registerApiRoutes } from '../shared/mpServerCore';

dotenv.config();

const app = express();
app.use(express.json({ limit: '512kb' }));

// Prevent Vercel Edge/CDN from caching dynamic multiplayer state
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
});

registerApiRoutes(app);

export default app;

