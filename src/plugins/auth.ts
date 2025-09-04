import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { verifyAccessToken } from "../lib/jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: { sub: string; role: "admin" | "merchant" | "customer" };
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

import type { FastifyRequest, FastifyReply } from "fastify";

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("user", null);

  app.decorate(
    "authenticate",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const header =
        (req.headers["authorization"] as string | undefined) ??
        (req.headers["Authorization"] as string | undefined);

      if (!header || !header.startsWith("Bearer ")) {
        reply.code(401).send({ error: "invalid_token" });
        return;
      }

      const token = header.slice("Bearer ".length).trim();
      try {
        const payload = verifyAccessToken(token);
        // normalize role to the enum values you use
        const role = (payload.role || "").toLowerCase() as
          | "admin"
          | "merchant"
          | "customer";
        req.user = { sub: payload.sub, role };
      } catch {
        reply.code(401).send({ error: "invalid_token" });
      }
    }
  );
};

export default fp(authPlugin, { name: "auth" });
