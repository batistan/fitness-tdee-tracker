import { sign } from "hono/jwt";

const TEST_SECRET = "test-jwt-secret";

/** Returns the test JWT secret. Set this in Deno.env before using auth middleware. */
export function getTestSecret(): string {
  return TEST_SECRET;
}

/** Mint a JWT for testing with the given userId as the sub claim. */
export async function createTestToken(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await sign(
    { sub: userId, iat: now, exp: now + 3600 },
    TEST_SECRET,
    "HS256"
  );
}

/** Build a Request with Authorization: Bearer <token> header. */
export async function authenticatedRequest(
  url: string,
  userId: string,
  init?: RequestInit
): Promise<Request> {
  const token = await createTestToken(userId);
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return new Request(url, { ...init, headers });
}

/** Set up env vars required for auth middleware in tests. */
export function setupAuthEnv(): void {
  Deno.env.set("JWT_SECRET", TEST_SECRET);
  Deno.env.set("DATABASE_URL", "postgresql://test");
}
