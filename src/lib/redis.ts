import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl);

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

export const getCache = async (key: string): Promise<string | null> => {
  if (!redis || redis.status !== 'ready') return null;
  return await redis.get(key);
};

export const setCache = async (key: string, value: string, ttlSeconds?: number): Promise<void> => {
  if (!redis || redis.status !== 'ready') return;
  if (ttlSeconds) {
    await redis.set(key, value, 'EX', ttlSeconds);
  } else {
    await redis.set(key, value);
  }
};

export const invalidateCache = async (key: string): Promise<void> => {
  if (!redis || redis.status !== 'ready') return;
  await redis.del(key);
};

export const flushCache = async (): Promise<void> => {
  if (!redis || redis.status !== 'ready') return;
  await redis.flushdb();
};

export const invalidateCaches = async (pattern: string): Promise<void> => {
  if (!redis || redis.status !== 'ready') return;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(keys);
  }
};

export const incrementCache = async (key: string): Promise<number | null> => {
  if (!redis || redis.status !== 'ready') return null;
  return await redis.incr(key);
};

export const decrementCache = async (key: string): Promise<number | null> => {
  if (!redis || redis.status !== 'ready') return null;
  return await redis.decr(key);
};

export default redis;
