import { Hono } from "hono";
import { sign } from "hono/jwt";
import { getEnv } from "../config/env.ts";

/**
 * Dev-only routes for testing. Only mounted in development/QA environments.
 * POST /token - Mint a JWT with an arbitrary userId for testing.
 */
export function createDevRoute(): Hono {
  return new Hono().post("/token", async (c) => {
    const body = await c.req.json();
    const userId = body.userId;

    if (!userId || typeof userId !== "string") {
      return c.json({ error: "userId (string) is required in request body" }, 400);
    }

    const env = getEnv();
    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      {
        sub: userId,
        iat: now,
        exp: now + 86400, // 24 hours
      },
      env.JWT_SECRET,
      "HS256"
    );

    return c.json({ token });
  });
}
