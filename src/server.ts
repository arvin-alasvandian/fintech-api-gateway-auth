// src/server.ts
import app from "./app.js";

const port = Number(process.env.PORT ?? 8080);
const host = "0.0.0.0";

try {
  await app.listen({ port, host });
  app.log.info(`Server running on http://localhost:${port}`);
  app.log.info(`Docs at http://localhost:${port}/docs`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
