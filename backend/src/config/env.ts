import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Validate all required env vars at startup.
// Fail fast with a clear error rather than a cryptic runtime crash later.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Rate limiting for tool endpoints (called by voice AI)
  TOOL_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  TOOL_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),

  // Frontend base URL — used for Stripe success/cancel redirect URLs
  FRONTEND_URL: z.string().default('http://localhost:3000'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    '❌  Invalid environment configuration:\n',
    result.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = result.data;

// Convenience flag — avoids string comparisons in application code
export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
