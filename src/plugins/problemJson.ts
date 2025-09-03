import fp from "fastify-plugin";

type Problem = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
};

export default fp(async (app) => {
  // Standard Problem+JSON 404
  app.setNotFoundHandler((req, reply) => {
    const problem: Problem = {
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: `Route ${req.method}:${req.url} not found`,
      instance: req.url,
    };
    reply.code(404).type("application/problem+json").send(problem);
  });

  // Standard Problem+JSON error handler
  app.setErrorHandler((err, req, reply) => {
    const status =
      typeof (err as any).statusCode === "number" && (err as any).statusCode >= 400
        ? (err as any).statusCode
        : 500;

    const problem: Problem = {
      type: "about:blank",
      title: status === 500 ? "Internal Server Error" : err.name || "Error",
      status,
      detail: err.message,
      instance: req.url,
    };

    req.log.error(err);
    // Always respond via Fastify reply (do NOT use reply.raw.end)
    reply.code(status).type("application/problem+json").send(problem);
  });
});
