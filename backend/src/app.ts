import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env, isProd } from './config/env';
import toolsRouter  from './modules/tools/tools.routes';
import adminRouter  from './modules/admin/admin.routes';
import authRouter   from './modules/auth/auth.routes';
import publicRouter from './modules/public/public.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// ─────────────────────────────────────────────────────────────────────────────
// Express application factory
//
// Keeping app creation separate from server startup (server.ts) makes the app
// importable in tests without binding to a port.
// ─────────────────────────────────────────────────────────────────────────────

export function createApp(): Application {
  const app = express();

  // ── Security headers ────────────────────────────────────────────────────────
  // helmet sets safe defaults: no X-Powered-By, strict CSP, HSTS in prod, etc.
  app.use(helmet());

  // ── CORS ────────────────────────────────────────────────────────────────────
  // In production, restrict origins to your known frontend/voice-AI hosts.
  // For now, allow all — tighten in production config.
  app.use(
    cors({
      origin: isProd ? process.env['ALLOWED_ORIGINS']?.split(',') : '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
    }),
  );

  // ── Request parsing ─────────────────────────────────────────────────────────
  app.use(express.json({ limit: '100kb' })); // reject oversized payloads early
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // ── HTTP request logging ────────────────────────────────────────────────────
  app.use(morgan(isProd ? 'combined' : 'dev'));

  // ── Global rate limiting ────────────────────────────────────────────────────
  // A broad limit to protect against traffic spikes.
  // Tool endpoints have an additional per-key limit in toolAuthMiddleware.
  const globalLimiter = rateLimit({
    windowMs: env.TOOL_RATE_LIMIT_WINDOW_MS,
    max: env.TOOL_RATE_LIMIT_MAX,
    standardHeaders: true, // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests, please try again later.',
      data: null,
      errorCode: 'RATE_LIMITED',
    },
  });
  app.use('/v1', globalLimiter);

  // ── Health check ─────────────────────────────────────────────────────────────
  // Unauthenticated — used by load balancers, Docker healthchecks, uptime bots.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── API routes ───────────────────────────────────────────────────────────────
  app.use('/v1/auth',   authRouter);
  app.use('/v1/tools',  toolsRouter);
  app.use('/v1/admin',  adminRouter);
  app.use('/v1/public', publicRouter);

  // Future route groups (add as implemented):
  // app.use('/v1/auth',  authRouter);   // login, token refresh

  // ── 404 catch-all ────────────────────────────────────────────────────────────
  app.use(notFoundHandler);

  // ── Global error handler ──────────────────────────────────────────────────────
  // MUST be last — Express identifies error handlers by arity (4 params)
  app.use(errorHandler);

  return app;
}
