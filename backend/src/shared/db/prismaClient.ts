import { PrismaClient } from '@prisma/client';
import { isProd } from '../../config/env';

// Singleton PrismaClient.
// In development, attach to `global` to survive hot-reloads (ts-node-dev)
// without exhausting the PostgreSQL connection pool.
// In production, a plain module-level singleton is fine.

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: isProd
      ? ['error', 'warn']
      : ['query', 'info', 'warn', 'error'],
    errorFormat: 'pretty',
  });
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

if (!isProd) {
  globalThis.__prisma = prisma;
}
