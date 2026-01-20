import type { Context, Next } from "hono";
import { getLogger } from "./logger.ts";

interface RequestLogOptions {
  logPayloads: boolean;
}

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

    if (options.logPayloads) {
      try {
        const body = await c.req.text();
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
        requestLog.payloadError = "Failed to parse request body";
      }
    }

    logger.info("Incoming request", requestLog);

    c.set("requestId", requestId);

    await next();

    const endTime = performance.now();
    const duration = Math.round((endTime - startTime) * 100) / 100;

    const responseLog: Record<string, unknown> = {
      requestId,
      method,
      path,
      status: c.res.status,
      durationMs: duration,
    };

    if (options.logPayloads) {
      try {
        const responseClone = c.res.clone();
        const body = await responseClone.text();
        if (body) {
          responseLog.payload = JSON.parse(body);
        }
      } catch (_error) {}
    }

    const logLevel = c.res.status >= 500 ? "error" : c.res.status >= 400 ? "warn" : "info";
    logger[logLevel]("Request completed", responseLog);
  };
}


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
