import fp from "fastify-plugin";

// Use a type-only import so we don't fight ESM/CJS default-exports at compile time
type RedisClient = import("ioredis").Redis;

declare module "fastify" {
  interface FastifyInstance {
    redis: RedisClient;
  }
}

/**
 * Redis plugin that works under ESM (node16/nodenext) regardless of ioredis' export shape.
 */
const redisPlugin = fp(async (app) => {
  const url = process.env.REDIS_URL || "redis://localhost:6379";

  // ESM/CJS-safe constructor grab
  const mod = await import("ioredis");
  const RedisCtor: any = (mod as any).default ?? (mod as any);

  const client: RedisClient = new RedisCtor(url);

  app.decorate("redis", client);

  app.addHook("onClose", async () => {
    try {
      await client.quit();
    } catch {
      /* ignore */
    }
  });
}, { name: "redis" });

export default redisPlugin;
