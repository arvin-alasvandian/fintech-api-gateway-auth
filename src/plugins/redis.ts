import fp from "fastify-plugin";
import Redis from "ioredis";

export default fp(async (app) => {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const redis = new Redis(url);
  app.decorate("redis", redis);
  app.addHook("onClose", async () => { await redis.quit(); });
});

declare module "fastify" {
  interface FastifyInstance { redis: import("ioredis").Redis; }
}
