import Redis from 'ioredis';

const redisHost = process.env.REDIS_HOST || '192.168.88.5';
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const redisPassword = process.env.REDIS_PASSWORD;

export const redis = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on('error', (err) => console.error('[REDIS] Error:', err));
redis.on('connect', () => console.log(`[REDIS] Connected to ${redisHost}:${redisPort}`));

export const getHandoffKey = (merchantId: string, sender: string) => `handoff:${merchantId}:${sender}`;
export const getRateLimitKey = (merchantId: string, sender: string) => `ratelimit:${merchantId}:${sender}`;
export const getBotExpectationKey = (instance: string, sender: string) => `botexpect:${instance}:${sender}`;

export async function isPaused(merchantId: string, sender: string): Promise<boolean> {
  const paused = await redis.get(getHandoffKey(merchantId, sender));
  return !!paused;
}

export async function setPause(merchantId: string, sender: string, minutes: number = 30) {
  await redis.set(getHandoffKey(merchantId, sender), '1', 'EX', minutes * 60);
}

export async function setBotExpectation(instance: string, sender: string) {
  await redis.set(getBotExpectationKey(instance, sender), '1', 'EX', 10); // 10 seconds window
}

export async function consumeBotExpectation(instance: string, sender: string): Promise<boolean> {
  const key = getBotExpectationKey(instance, sender);
  const exists = await redis.get(key);
  if (exists) {
    await redis.del(key);
    return true;
  }
  return false;
}

export async function checkRateLimit(merchantId: string, sender: string, limit: number = 5): Promise<boolean> {
  const key = getRateLimitKey(merchantId, sender);
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, 60); // 1 minute window
  }
  return current <= limit;
}
