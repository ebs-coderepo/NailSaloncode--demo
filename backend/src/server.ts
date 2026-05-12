import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './shared/db/prismaClient';
import redis from './config/redis';

// ─────────────────────────────────────────────────────────────────────────────
// Server entrypoint
//
// Responsibilities:
//  1. Verify infrastructure connections (DB, Redis) before accepting traffic
//  2. Start the HTTP server
//  3. Handle graceful shutdown (SIGTERM / SIGINT) for zero-downtime deploys
// ─────────────────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  // ── Connectivity checks ──────────────────────────────────────────────────────
  // Fail before binding to port so the orchestrator (Docker, k8s) knows startup
  // failed and can restart / alert instead of routing traffic to a broken pod.
  try {
    await prisma.$connect();
    console.log('✅  PostgreSQL connected');
  } catch (err) {
    console.error('❌  PostgreSQL connection failed:', err);
    process.exit(1);
  }

  // Redis connection is handled inside the redis module (ioredis auto-connects),
  // but we ping to verify before accepting requests.
  try {
    await redis.ping();
    console.log('✅  Redis ping OK');
  } catch (err) {
    console.error('❌  Redis ping failed:', err);
    process.exit(1);
  }

  // ── Start HTTP server ────────────────────────────────────────────────────────
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(
      `🚀  Server running on port ${env.PORT} [${env.NODE_ENV}]`,
    );
    console.log(`   Health: http://localhost:${env.PORT}/health`);
    console.log(`   Tools:  http://localhost:${env.PORT}/v1/tools`);
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────────
  // On SIGTERM (Docker stop / k8s pod eviction): stop accepting new connections,
  // finish in-flight requests, then disconnect from DB and Redis cleanly.
  async function shutdown(signal: string): Promise<void> {
    console.log(`\n⚠️   Received ${signal} — shutting down gracefully...`);

    server.close(async () => {
      try {
        await prisma.$disconnect();
        console.log('✅  Prisma disconnected');

        await redis.quit();
        console.log('✅  Redis disconnected');

        console.log('👋  Process exiting cleanly');
        process.exit(0);
      } catch (err) {
        console.error('Shutdown error:', err);
        process.exit(1);
      }
    });

    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => {
      console.error('❌  Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 10_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Surface unhandled rejections as crashes rather than silent failures
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
    process.exit(1);
  });
}

bootstrap();
