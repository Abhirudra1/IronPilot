import express from 'express';
import crypto from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { sanitizeInput } from './middleware/sanitize.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import libraryRoutes from './routes/library.routes.js';
import planRoutes from './routes/plan.routes.js';
import sessionRoutes from './routes/session.routes.js';
import trackingRoutes from './routes/tracking.routes.js';
import aiRoutes from './routes/ai.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import adminRoutes from './routes/admin.routes.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  // Correlation id on every request/response (echoed in error payloads for support)
  app.use((req, res, next) => { req.id = String(req.headers['x-request-id'] || crypto.randomUUID()).slice(0, 64); res.setHeader('X-Request-Id', req.id); next(); });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.clientUrl.split(',').map((s) => s.trim()), credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '6mb', strict: true })); // progress photos are sent as data URLs (validated as image data URLs)
  app.use(sanitizeInput);
  if (env.nodeEnv !== 'test') app.use(morgan(env.isProd ? 'combined' : 'dev'));
  app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, env: env.nodeEnv, time: new Date().toISOString() }));
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  // The library changes rarely: let browsers reuse it for 5 minutes (per user) and revalidate with ETags
  app.use('/api/library', (req, res, next) => { if (req.method === 'GET') res.setHeader('Cache-Control', 'private, max-age=300, stale-while-revalidate=600'); next(); }, libraryRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/tracking', trackingRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
