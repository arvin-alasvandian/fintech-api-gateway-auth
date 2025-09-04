// src/app.ts
import Fastify, { type FastifyInstance } from "fastify";

// local plugins (ESM paths need .js suffix with nodenext)
import prismaPlugin from "./plugins/prisma.js";
import redisPlugin from "./plugins/redis.js";
import rateLimitPlugin from "./plugins/rateLimit.js";
import passwordPolicyPlugin from "./plugins/passwordPolicy.js";
import authPlugin from "./plugins/auth.js";

// routes
import healthRoutes from "./routes/health.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";

// (optional) docs
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

export default async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    trustProxy: true,
  });

  // Core plugins
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(rateLimitPlugin);
  await app.register(passwordPolicyPlugin);
  await app.register(authPlugin); // adds app.authenticate preHandler & typed user

  // Routes
  await app.register(healthRoutes);
  await app.register(adminRoutes);
  await app.register(authRoutes);

  // API docs at /docs (safe to remove if you don't need it)
  await app.register(swagger, {
    openapi: {
      info: { title: "Fintech Auth API", version: "1.0.0" },
    },
  });
  await app.register(swaggerUi, {
    routePrefix: "/docs",
    staticCSP: true,
  });

  // Single 404 handler (Problem+JSON)
  app.setNotFoundHandler(async (req, reply) => {
    const problem = {
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: `Route ${req.method}:${req.url} not found`,
      instance: req.url,
    };
    reply
      .code(404)
      .type("application/problem+json; charset=utf-8")
      .send(problem);
  });

  // Unified error handler (Problem+JSON)
  app.setErrorHandler(async (err, req, reply) => {
    const status = typeof err.statusCode === "number" ? err.statusCode : 500;
    const title =
      err.name || (status === 500 ? "Internal Server Error" : "Error");
    const detail = err.message || "Unexpected error";

    reply
      .code(status)
      .type("application/problem+json; charset=utf-8")
      .send({
        type: "about:blank",
        title,
        status,
        detail,
        instance: req.url,
      });
  });

  return app;
}