// src/app.ts
import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import prismaPlugin from "./plugins/prisma.js";
import redisPlugin from "./plugins/redis.js";
import rateLimitPlugin from "./plugins/rateLimit.js";
import passwordPolicyPlugin from "./plugins/passwordPolicy.js";

import healthRoutes from "./routes/health.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";

const app = Fastify({ logger: true });

// Core plugins
await app.register(prismaPlugin);
await app.register(redisPlugin);
await app.register(rateLimitPlugin);
await app.register(passwordPolicyPlugin);

// Swagger (serves our openapi/openapi.yaml)
await app.register(swagger, {
  mode: "static",
  specification: {
    path: "./openapi/openapi.yaml",
    baseDir: process.cwd(),
  },
});
await app.register(swaggerUI, {
  routePrefix: "/docs",
  staticCSP: true,
});

// Tight rate-limit on login only (5/min)
app.addHook("onRoute", (routeOptions) => {
  if (routeOptions.url === "/v1/auth/login") {
    routeOptions.config = routeOptions.config || {};
    (routeOptions.config as any).rateLimit = { max: 5, timeWindow: "1 minute" };
  }
});

// Routes
await app.register(healthRoutes);
await app.register(authRoutes);
await app.register(adminRoutes);

export default app;
