// src/routes/admin.ts
import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";

type JwtPayload = { sub: string; role?: string; iat?: number; exp?: number };

export default async function adminRoutes(app: FastifyInstance) {
  app.get("/v1/admin/ping", async (req, reply) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return reply.code(401).send({ error: "invalid_token" });

      const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || "dev-secret-change-me";
      const payload = jwt.verify(token, secret) as JwtPayload;

      if (payload.role !== "admin") {
        return reply.code(403).send({ error: "forbidden", message: "admin role required" });
      }

      return { ok: true, role: payload.role ?? null };
    } catch {
      return reply.code(401).send({ error: "invalid_token" });
    }
  });
}
