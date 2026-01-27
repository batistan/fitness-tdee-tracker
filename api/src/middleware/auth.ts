import { jwt } from "hono/jwt";
import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import { getEnv } from "../config/env.ts";

/**
 * JWT authentication middleware.
 * Validates the Bearer token and extracts the userId (sub claim).
 * Sets `userId` on the Hono context for downstream handlers.
 */
export function authMiddleware() {
  const jwtMiddleware = jwt({
    secret: getEnv().JWT_SECRET,
    alg: "HS256",
  });

  const extractUser = createMiddleware(async (c: Context, next: Next) => {
    const payload = c.get("jwtPayload");
    if (!payload?.sub) {
      return c.json({ error: "Token missing sub claim" }, 401);
    }
    c.set("userId", payload.sub);
    await next();
  });

  return async (c: Context, next: Next) => {
    // Run Hono's JWT verification first, then extract userId
    await jwtMiddleware(c, async () => {
      await extractUser(c, next);
    });
  };
}

/** Helper to read the authenticated userId from context. */
export function getUserId(c: Context): string {
  return c.get("userId");
}
