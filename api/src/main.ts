import { Hono } from "hono";
import { cors } from "hono/cors";
import { getEnv } from "./config/env.ts";
import { createDatabase } from "./db/client.ts";
import { createHealthRepository } from "./repositories/health.ts";
import { createEntryRepository } from "./repositories/entries.ts";
import { createHealthRoute } from "./routes/health.ts";
import { createEntriesRoute } from "./routes/entries.ts";
import { createStatsRoute } from "./routes/stats.ts";
import { createDevRoute } from "./routes/dev.ts";
import { authMiddleware } from "./middleware/auth.ts";
import { initLogger, getLogger, requestLogger, errorHandler, createDatabaseLogger } from "./telemetry/mod.ts";

function main() {
  const env = getEnv();

  // Initialize logger with environment-specific log level
  initLogger(env.LOG_LEVEL);
  const logger = getLogger();

  // Initialize database with optional query logging (only in development or QA)
  const db = createDatabase(
    env.DATABASE_URL,
    env.ENVIRONMENT !== "production" ? { logger: createDatabaseLogger() } : undefined
  );

  const entryRepo = createEntryRepository(db);

  const healthRoute = createHealthRoute(createHealthRepository(db));
  const entriesRoute = createEntriesRoute(entryRepo);
  const statsRoute = createStatsRoute(entryRepo);

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
    // Public routes
    .route("/health", healthRoute);

  // JWT-protected routes grouped under a sub-app
  const authenticated = new Hono()
    .use("*", authMiddleware())
    .route("/entries", entriesRoute)
    .route("/stats", statsRoute);

  app.route("/", authenticated);

  // Dev-only token minting (not in production)
  if (env.ENVIRONMENT !== "production") {
    app.route("/dev", createDevRoute());
    logger.info("Dev routes enabled at /dev");
  }

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
