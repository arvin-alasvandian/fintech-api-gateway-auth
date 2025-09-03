// src/plugins/passwordPolicy.ts
import fp from "fastify-plugin";

function checkPassword(pw: unknown) {
  if (typeof pw !== "string") return { ok: false, reason: "Password required" };
  const minLen = pw.length >= 8;
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  if (minLen && hasLetter && hasDigit) return { ok: true as const };
  return {
    ok: false as const,
    reason:
      "Weak password: min 8 chars and must include at least one letter and one number.",
  };
}

export default fp(async (app) => {
  app.addHook("preValidation", async (req, reply) => {
    // Only enforce on the register route
    if (req.routeOptions?.url === "/v1/auth/register") {
      const body = req.body as { password?: unknown } | undefined;
      const res = checkPassword(body?.password);
      if (!res.ok) {
        return reply.code(400).send({ error: "weak_password", message: res.reason });
      }
    }
  });
});
