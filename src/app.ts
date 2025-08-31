import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { readFileSync } from "fs";
import { parse as parseYAML } from "yaml";
import prismaPlugin from "./plugins/prisma.js";
import redisPlugin from "./plugins/redis.js";
import healthRoutes from "./routes/health.js";

export function buildApp() {
  const app = Fastify({
    logger: { level: process.env.NODE_ENV === "production" ? "info" : "debug" },
    disableRequestLogging: false,
    trustProxy: true
  });

  app.register(prismaPlugin);
  app.register(redisPlugin);
  app.register(healthRoutes);

  const specText = readFileSync(new URL("../openapi/openapi.yaml", import.meta.url), "utf8");
  const spec = parseYAML(specText);
  app.register(swagger, { mode: "static", specification: { document: spec as any } });
  app.register(swaggerUI, { routePrefix: "/docs", uiConfig: { docExpansion: "list" } });

  return app;
}

export type AppType = ReturnType<typeof buildApp>;
