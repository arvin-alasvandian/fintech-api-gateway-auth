import { FastifyInstance } from "fastify";

export default async function healthRoutes(app: FastifyInstance) {
  app.get("/healthz", async () => ({ ok: true }));
  app.get("/readyz", async () => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      await app.redis.ping();
      return { ready: true };
    } catch {
      return { ready: false };
    }
  });
}
