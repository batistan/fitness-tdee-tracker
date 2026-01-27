import { assertEquals } from "@std/assert";
import { createHealthRoute } from "@src/routes/health.ts";
import { createMockHealthRepository } from "@tests/mocks/repositories.ts";

const originalEnv = { ...Deno.env.toObject() };

function setupTestEnv() {
  Deno.env.set("DATABASE_URL", "postgresql://test");
  Deno.env.set("JWT_SECRET", "test-secret");
}

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

Deno.test("health route", async (t) => {
  setupTestEnv();

  await t.step("returns ok status when database is connected", async () => {
    const mockRepo = createMockHealthRepository({ connected: true });
    const route = createHealthRoute(mockRepo);

    const req = new Request("http://localhost/");
    const res = await route.fetch(req);
    const body = await res.json();

    assertEquals(res.status, 200);
    assertEquals(body.status, "ok");
    assertEquals(body.database, "connected");
    assertEquals(body.databaseError, undefined);
  });

  await t.step("returns degraded status when database is disconnected", async () => {
    const mockRepo = createMockHealthRepository({
      connected: false,
      error: "Connection refused",
    });
    const route = createHealthRoute(mockRepo);

    const req = new Request("http://localhost/");
    const res = await route.fetch(req);
    const body = await res.json();

    assertEquals(res.status, 200);
    assertEquals(body.status, "degraded");
    assertEquals(body.database, "disconnected");
    assertEquals(body.databaseError, "Connection refused");
  });

  await t.step("includes timestamp in response", async () => {
    const mockRepo = createMockHealthRepository({ connected: true });
    const route = createHealthRoute(mockRepo);

    const before = new Date().toISOString();
    const req = new Request("http://localhost/");
    const res = await route.fetch(req);
    const body = await res.json();
    const after = new Date().toISOString();

    assertEquals(typeof body.timestamp, "string");
    assertEquals(body.timestamp >= before, true);
    assertEquals(body.timestamp <= after, true);
  });

  await t.step("includes environment in response", async () => {
    const mockRepo = createMockHealthRepository({ connected: true });
    const route = createHealthRoute(mockRepo);

    const req = new Request("http://localhost/");
    const res = await route.fetch(req);
    const body = await res.json();

    assertEquals(typeof body.environment, "string");
  });

  resetEnv();
});
