import { Hono } from "hono";
import { cors } from "hono/cors";
import { getEnv } from "./config/env.ts";
import { createDatabase } from "./db/client.ts";
import { createHealthRepository } from "./repositories/health.ts";
import { createHealthRoute } from "./routes/health.ts";
import { initLogger, getLogger, requestLogger, errorHandler, createDatabaseLogger } from "./telemetry/mod.ts";

function main() {
  const env = getEnv();

  // Initialize logger with environment-specific log level
  initLogger(env.LOG_LEVEL);
  const logger = getLogger();

  // Initialize database with optional query logging (only in development)
  const db = createDatabase(
    env.DATABASE_URL,
    env.LOG_LEVEL === "debug" ? { logger: createDatabaseLogger() } : undefined
  );

  const healthRoute = createHealthRoute(createHealthRepository(db));

  const app = new Hono()
    // Error handler must be first to catch all errors
    .use("*", errorHandler())
    // Request/response logging with performance metrics
    .use("*", requestLogger({ logPayloads: env.LOG_PAYLOADS }))
    // CORS configuration
    .use("*", cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }))
    .route("/health", healthRoute);

  logger.info("Starting API server", {
    port: env.PORT,
    environment: env.ENVIRONMENT,
    corsOrigin: env.CORS_ORIGIN,
    logLevel: env.LOG_LEVEL,
    logPayloads: env.LOG_PAYLOADS,
  });

  Deno.serve({ port: env.PORT }, app.fetch);
}

main();
