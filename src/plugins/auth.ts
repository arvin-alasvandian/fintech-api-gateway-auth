import fp from "fastify-plugin";
import { verifyAccessToken } from "../lib/jwt.js";

export default fp(async (app) => {
  app.decorate("authenticate", async (req, reply) => {
    const h = req.headers.authorization;
    if (!h || !h.startsWith("Bearer ")) return reply.code(401).send({ error: "unauthorized" });
    const token = h.slice("Bearer ".length);
    try {
      const { payload } = await verifyAccessToken(token);
      req.user = payload as any;
    } catch {
      return reply.code(401).send({ error: "invalid_token" });
    }
  });
});

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: any, reply: any) => Promise<void>;
  }
  interface FastifyRequest {
    user?: { sub?: string; role?: "admin" | "merchant" | "customer"; [k: string]: any };
  }
}
