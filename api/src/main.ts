import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { getEnv } from "./config/env.ts";
import { getDatabase } from "./db/client.ts";
import { createHealthRepository } from "./repositories/health.ts";
import { createHealthRoute } from "./routes/health.ts";

function main() {
  const env = getEnv();
  const db = getDatabase();

  const healthRoute = createHealthRoute(createHealthRepository(db));

  const app = new Hono()
    .use("*", logger())
    .use("*", cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }))
    .route("/health", healthRoute);

  console.log(`Starting API server on port ${env.PORT} (${env.ENVIRONMENT})`);

  Deno.serve({ port: env.PORT }, app.fetch);
}

main();
