import { assertEquals, assertThrows } from "@std/assert";

const originalEnv = { ...Deno.env.toObject() };

function resetEnv() {
  for (const key of Object.keys(Deno.env.toObject())) {
    if (!(key in originalEnv)) {
      Deno.env.delete(key);
    }
  }
  for (const [key, value] of Object.entries(originalEnv)) {
    Deno.env.set(key, value);
  }
}

async function importFreshEnv() {
  const timestamp = Date.now();
  const module = await import(`@src/config/env.ts?t=${timestamp}`);
  return module.getEnv;
}

Deno.test("environment config", async (t) => {
  await t.step("throws when DATABASE_URL is missing", async () => {
    resetEnv();
    Deno.env.delete("DATABASE_URL");
    const getEnv = await importFreshEnv();

    assertThrows(
      () => getEnv(),
      Error,
      "DATABASE_URL environment variable is required"
    );
  });

  await t.step("returns development config by default", async () => {
    resetEnv();
    Deno.env.set("DATABASE_URL", "postgresql://test");
    Deno.env.set("JWT_SECRET", "test-secret");
    Deno.env.delete("ENVIRONMENT");
    const getEnv = await importFreshEnv();

    const env = getEnv();

    assertEquals(env.ENVIRONMENT, "development");
    assertEquals(env.PORT, 8000);
    assertEquals(env.CORS_ORIGIN, "http://localhost:3000");
    assertEquals(env.LOG_PAYLOADS, true);
  });

  await t.step("returns qa config when ENVIRONMENT=qa", async () => {
    resetEnv();
    Deno.env.set("DATABASE_URL", "postgresql://test");
    Deno.env.set("JWT_SECRET", "test-secret");
    Deno.env.set("ENVIRONMENT", "qa");
    const getEnv = await importFreshEnv();

    const env = getEnv();

    assertEquals(env.ENVIRONMENT, "qa");
    assertEquals(env.CORS_ORIGIN, "https://calometri-web-qa.deno.dev");
    assertEquals(env.LOG_PAYLOADS, true);
  });

  await t.step("returns production config when ENVIRONMENT=production", async () => {
    resetEnv();
    Deno.env.set("DATABASE_URL", "postgresql://test");
    Deno.env.set("JWT_SECRET", "test-secret");
    Deno.env.set("ENVIRONMENT", "production");
    const getEnv = await importFreshEnv();

    const env = getEnv();

    assertEquals(env.ENVIRONMENT, "production");
    assertEquals(env.CORS_ORIGIN, "https://calometri-web.deno.dev");
    assertEquals(env.LOG_PAYLOADS, false);
  });

  await t.step("allows PORT override via environment variable", async () => {
    resetEnv();
    Deno.env.set("DATABASE_URL", "postgresql://test");
    Deno.env.set("JWT_SECRET", "test-secret");
    Deno.env.set("PORT", "9000");
    const getEnv = await importFreshEnv();

    const env = getEnv();

    assertEquals(env.PORT, 9000);
  });

  await t.step("allows CORS_ORIGIN override via environment variable", async () => {
    resetEnv();
    Deno.env.set("DATABASE_URL", "postgresql://test");
    Deno.env.set("JWT_SECRET", "test-secret");
    Deno.env.set("CORS_ORIGIN", "https://custom-origin.com");
    const getEnv = await importFreshEnv();

    const env = getEnv();

    assertEquals(env.CORS_ORIGIN, "https://custom-origin.com");
  });

  await t.step("includes DATABASE_URL from environment", async () => {
    resetEnv();
    Deno.env.set("DATABASE_URL", "postgresql://user:pass@host/db");
    Deno.env.set("JWT_SECRET", "test-secret");
    const getEnv = await importFreshEnv();

    const env = getEnv();

    assertEquals(env.DATABASE_URL, "postgresql://user:pass@host/db");
  });

  await t.step("throws when JWT_SECRET is missing", async () => {
    resetEnv();
    Deno.env.set("DATABASE_URL", "postgresql://test");
    Deno.env.delete("JWT_SECRET");
    const getEnv = await importFreshEnv();

    assertThrows(
      () => getEnv(),
      Error,
      "JWT_SECRET environment variable is required"
    );
  });

  await t.step("throws on unknown environment", async () => {
    resetEnv();
    Deno.env.set("DATABASE_URL", "postgresql://test");
    Deno.env.set("JWT_SECRET", "test-secret");
    Deno.env.set("ENVIRONMENT", "invalid");
    const getEnv = await importFreshEnv();

    assertThrows(
      () => getEnv(),
      Error,
      "Unknown environment: invalid"
    );
  });

  resetEnv();
});
