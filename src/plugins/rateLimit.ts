// src/plugins/rateLimit.ts
import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import IORedis from "ioredis";

export default fp(async (app) => {
  let redis: IORedis | undefined;

  try {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    redis = new IORedis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
    await redis.connect();
    app.log.info("rate-limit: using Redis backend");
  } catch {
    app.log.warn("rate-limit: Redis unavailable, falling back to in-memory store");
    redis = undefined;
  }

  // Global plugin; per-route overrides will apply where specified.
  await app.register(rateLimit, {
    max: 1000,              // generous global ceiling
    timeWindow: "1 minute",
    skipOnError: true,      // don't 500 if Redis hiccups
    nameSpace: "rl:",
    redis,                  // if undefined, uses in-memory
    keyGenerator: (req) =>
      (req.headers["x-forwarded-for"] as string) || req.ip,
  });
});
