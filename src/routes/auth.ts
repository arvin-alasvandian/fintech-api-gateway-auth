import { FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { signAccessToken } from "../lib/jwt.js";

function nowPlusDays(d: number) {
  const n = new Date();
  n.setDate(n.getDate() + d);
  return n;
}

export default async function authRoutes(app: FastifyInstance) {
  // REGISTER
  app.post("/v1/auth/register", async (req, reply) => {
    const body = req.body as { email: string; password: string; role?: string };
    if (!body?.email || !body?.password) {
      return reply.code(400).send({ error: "missing_fields" });
    }

    // normalize & validate role against your enum values in DB
    const allowedRoles = new Set(["admin", "merchant", "customer"]);
    const normalizedRole = (body.role ?? "customer").toLowerCase();
    if (!allowedRoles.has(normalizedRole)) {
      return reply.code(400).send({ error: "invalid_role", allowed: Array.from(allowedRoles) });
    }

    const exists = await app.prisma.user.findUnique({ where: { email: body.email } });
    if (exists) return reply.code(409).send({ error: "email_taken" });

    const passwordHash = await hashPassword(body.password);

    try {
      const user = await app.prisma.user.create({
        data: {
          email: body.email,
          passwordHash,
          role: normalizedRole as any, // enum: admin | merchant | customer
        },
        select: { id: true, email: true, role: true, createdAt: true },
      });
      return reply.code(201).send(user);
    } catch (e) {
      req.log.error(e);
      return reply.code(400).send({ error: "create_failed" });
    }
  });

  // LOGIN
  app.post("/v1/auth/login", async (req, reply) => {
    const body = req.body as { email: string; password: string };
    if (!body?.email || !body?.password) return reply.code(400).send({ error: "missing_fields" });

    const user = await app.prisma.user.findUnique({ where: { email: body.email } });
    if (!user) return reply.code(401).send({ error: "invalid_credentials" });

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: "invalid_credentials" });

    const accessToken = await signAccessToken({ sub: user.id, role: user.role.toLowerCase() });

    const raw = randomBytes(32).toString("hex");
    const refreshHash = await hashPassword(raw);
    const ttlDays = Number(process.env.REFRESH_TTL_DAYS || 30);

    const session = await app.prisma.session.create({
      data: {
        userId: user.id,
        refreshHash,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
        expiresAt: nowPlusDays(ttlDays),
      },
      select: { id: true },
    });

    const refreshToken = `${session.id}.${raw}`;
    return reply.send({ accessToken, refreshToken });
  });

  // REFRESH
  app.post("/v1/auth/refresh", async (req, reply) => {
    const body = req.body as { refreshToken: string };
    if (!body?.refreshToken) return reply.code(400).send({ error: "missing_fields" });

    const [sessionId, raw] = body.refreshToken.split(".");
    if (!sessionId || !raw) return reply.code(400).send({ error: "bad_token" });

    const session = await app.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session || session.revoked || session.expiresAt < new Date() || !session.user) {
      return reply.code(401).send({ error: "invalid_refresh" });
    }

    const ok = await (await import("bcryptjs")).compare(raw, session.refreshHash);
    if (!ok) return reply.code(401).send({ error: "invalid_refresh" });

    const accessToken = await signAccessToken({ sub: session.user.id, role: session.user.role.toLowerCase() });
    return reply.send({ accessToken });
  });

  // LOGOUT
  app.post("/v1/auth/logout", async (req, reply) => {
    const body = req.body as { refreshToken: string };
    if (!body?.refreshToken) return reply.code(400).send({ error: "missing_fields" });

    const [sessionId] = body.refreshToken.split(".");
    if (!sessionId) return reply.code(400).send({ error: "bad_token" });

    await app.prisma.session.updateMany({ where: { id: sessionId }, data: { revoked: true } });
    return reply.send({ ok: true });
  });

  // ME (FIXED)
  app.get("/v1/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload: any = req.user || {};
    const userId = payload.sub || payload.id;

    if (!userId) {
      return reply.code(401).send({ error: "invalid_token" });
    }

    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    if (!user) {
      return reply.code(401).send({ error: "invalid_token" });
    }

    return user;
  });
}
