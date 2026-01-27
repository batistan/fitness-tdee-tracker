import { assertEquals } from "@std/assert";
import { Hono } from "hono";
import { createStatsRoute } from "@src/routes/stats.ts";
import { createMockEntryRepository } from "@tests/mocks/repositories.ts";
import { authMiddleware } from "@src/middleware/auth.ts";
import { setupAuthEnv, authenticatedRequest } from "@tests/mocks/auth.ts";
import type { Entry } from "@src/db/schema.ts";

const originalEnv = { ...Deno.env.toObject() };

function createApp(entryRepo: ReturnType<typeof createMockEntryRepository>) {
  return new Hono()
    .use("/stats/*", authMiddleware())
    .route("/stats", createStatsRoute(entryRepo));
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

function todayOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

Deno.test("stats routes", async (t) => {
  setupAuthEnv();
  const userId = "user-123";

  await t.step("GET /tdee - returns 422 with insufficient data", async () => {
    const repo = createMockEntryRepository();
    const app = createApp(repo);

    const req = await authenticatedRequest(
      "http://localhost/stats/tdee",
      userId
    );
    const res = await app.fetch(req);
    const body = await res.json();

    assertEquals(res.status, 422);
    assertEquals(body.error, "Insufficient data");
  });

  await t.step("GET /tdee - returns TDEE stats with enough data", async () => {
    const entries = new Map<string, Entry>();
    // Create 7 entries within the last 28 days with stable weight
    for (let i = 0; i < 7; i++) {
      const date = todayOffset(i);
      const id = `e${i}`;
      entries.set(id, {
        id,
        userId,
        date,
        weight: "185.00",
        calories: 2200,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const repo = createMockEntryRepository({ entries });
    const app = createApp(repo);

    const req = await authenticatedRequest(
      "http://localhost/stats/tdee",
      userId
    );
    const res = await app.fetch(req);
    const body = await res.json();

    assertEquals(res.status, 200);
    assertEquals(typeof body.currentTDEE, "number");
    assertEquals(typeof body.weeklyAverageWeight, "number");
    assertEquals(typeof body.weeklyAverageCalories, "number");
    assertEquals(["gaining", "losing", "maintaining"].includes(body.weightTrend), true);
    assertEquals(body.dataPoints, 7);
  });

  await t.step("GET /tdee - accepts custom days parameter", async () => {
    const entries = new Map<string, Entry>();
    // Only entries within the last 7 days
    for (let i = 0; i < 5; i++) {
      const date = todayOffset(i);
      const id = `e${i}`;
      entries.set(id, {
        id,
        userId,
        date,
        weight: "185.00",
        calories: 2200,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const repo = createMockEntryRepository({ entries });
    const app = createApp(repo);

    const req = await authenticatedRequest(
      "http://localhost/stats/tdee?days=7",
      userId
    );
    const res = await app.fetch(req);
    const body = await res.json();

    assertEquals(res.status, 200);
    assertEquals(body.dataPoints, 5);
  });

  await t.step("GET /tdee - rejects unauthenticated request", async () => {
    const repo = createMockEntryRepository();
    const app = createApp(repo);

    const req = new Request("http://localhost/stats/tdee");
    const res = await app.fetch(req);

    assertEquals(res.status, 401);
  });

  resetEnv();
});
