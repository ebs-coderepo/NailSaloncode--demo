import Redis from 'ioredis';
import { env } from './env';

// Singleton Redis client shared across the entire application.
// ioredis handles reconnection internally — do not create per-request clients.
const redis = new Redis(env.REDIS_URL, {
  // Retry up to 10 times with exponential backoff, capped at 3 seconds.
  // This prevents thundering herd after a Redis restart.
  retryStrategy: (times) => Math.min(times * 100, 3000),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('connect', () => {
  console.log('✅  Redis connected');
});

redis.on('error', (err) => {
  // Log but don't crash — booking lock failures are handled gracefully
  console.error('❌  Redis error:', err.message);
});

redis.on('reconnecting', () => {
  console.warn('⚠️   Redis reconnecting...');
});

export default redis;
