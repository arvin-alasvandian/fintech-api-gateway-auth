import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";

// Type-only import for ioredis client
type RedisClient = import("ioredis").Redis;

declare module "fastify" {
  interface FastifyInstance {
    rateLimitRedis?: RedisClient;
  }
}

/**
 * Global rate limit with Redis backend (if REDIS_URL is set).
 * Compatible with @fastify/rate-limit v6 (for Fastify v4).
 */
const rateLimitPlugin = fp(async (app) => {
  let redis: RedisClient | undefined;

  if (process.env.REDIS_URL) {
    const mod = await import("ioredis");
    const RedisCtor: any = (mod as any).default ?? (mod as any);
    redis = new RedisCtor(process.env.REDIS_URL);
    app.decorate("rateLimitRedis", redis);
    app.log.info("rate-limit: using Redis backend");
  } else {
    app.log.info("rate-limit: using memory store");
  }

  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: "5 minutes",
    skipOnError: true,
    // For v6, pass the ioredis client directly
    ...(redis ? { redis } : {}),
  } as any);
}, { name: "rate-limit" });

export default rateLimitPlugin;