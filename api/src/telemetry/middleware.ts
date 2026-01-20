import type { Context, Next } from "hono";
import { getLogger } from "./logger.ts";

interface RequestLogOptions {
  logPayloads: boolean;
}

/**
 * Middleware for logging HTTP requests and responses with performance metrics
 */
export function requestLogger(options: RequestLogOptions) {
  return async (c: Context, next: Next) => {
    const logger = getLogger();
    const startTime = performance.now();

    const method = c.req.method;
    const path = c.req.path;
    const requestId = crypto.randomUUID();

    // Log incoming request
    const requestLog: Record<string, unknown> = {
      requestId,
      method,
      path,
      headers: Object.fromEntries(c.req.header()),
    };

    // Optionally log request payload
    if (options.logPayloads && (method === "POST" || method === "PUT" || method === "PATCH")) {
      try {
        const body = await c.req.text();
        // Parse and re-set the request body for downstream handlers
        if (body) {
          requestLog.payload = JSON.parse(body);
          // Re-create request with body for downstream middleware
          c.req = new Request(c.req.url, {
            method: c.req.method,
            headers: c.req.headers,
            body,
          }) as typeof c.req;
        }
      } catch (_error) {
        // If body parsing fails, continue without logging payload
        requestLog.payloadError = "Failed to parse request body";
      }
    }

    logger.info("Incoming request", requestLog);

    // Store requestId in context for use in error handlers
    c.set("requestId", requestId);

    // Process request
    await next();

    // Log response
    const endTime = performance.now();
    const duration = Math.round((endTime - startTime) * 100) / 100; // Round to 2 decimals

    const responseLog: Record<string, unknown> = {
      requestId,
      method,
      path,
      status: c.res.status,
      durationMs: duration,
    };

    // Optionally log response payload
    if (options.logPayloads) {
      try {
        const responseClone = c.res.clone();
        const body = await responseClone.text();
        if (body) {
          responseLog.payload = JSON.parse(body);
        }
      } catch (_error) {
        // If body parsing fails, continue without logging payload
      }
    }

    const logLevel = c.res.status >= 500 ? "error" : c.res.status >= 400 ? "warn" : "info";
    logger[logLevel]("Request completed", responseLog);
  };
}

/**
 * Middleware for catching and logging errors
 */
export function errorHandler() {
  return async (c: Context, next: Next) => {
    const logger = getLogger();
    const requestId = c.get("requestId") || "unknown";

    try {
      await next();
    } catch (error) {
      const errorLog: Record<string, unknown> = {
        requestId,
        method: c.req.method,
        path: c.req.path,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : "UnknownError",
        },
      };

      logger.error("Unhandled error", errorLog);

      // Return error response
      return c.json(
        {
          error: {
            message: "Internal server error",
            requestId,
          },
        },
        500
      );
    }
  };
}
