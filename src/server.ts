import "dotenv/config";
import { buildApp } from "./app.js";

const PORT = Number(process.env.PORT || 8080);
const app = buildApp();

async function start() {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`Server running on http://localhost:${PORT}`);
    app.log.info(`Docs at http://localhost:${PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
