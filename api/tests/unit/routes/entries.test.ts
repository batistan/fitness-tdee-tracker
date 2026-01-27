import { assertEquals } from "@std/assert";
import { Hono } from "hono";
import { createEntriesRoute } from "@src/routes/entries.ts";
import { createMockEntryRepository } from "@tests/mocks/repositories.ts";
import { authMiddleware } from "@src/middleware/auth.ts";
import { setupAuthEnv, authenticatedRequest } from "@tests/mocks/auth.ts";
import type { Entry } from "@src/db/schema.ts";

const originalEnv = { ...Deno.env.toObject() };

function createApp(entryRepo: ReturnType<typeof createMockEntryRepository>) {
  return new Hono()
    .use("/entries/*", authMiddleware())
    .route("/entries", createEntriesRoute(entryRepo));
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

Deno.test("entries routes", async (t) => {
  setupAuthEnv();
  const userId = "user-123";

  await t.step("POST / - creates an entry", async () => {
    const repo = createMockEntryRepository();
    const app = createApp(repo);

    const req = await authenticatedRequest(
      "http://localhost/entries/",
      userId,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2024-06-01",
          weight: 185.5,
          calories: 2100,
        }),
      }
    );
    const res = await app.fetch(req);
    const body = await res.json();

    assertEquals(res.status, 201);
    assertEquals(body.userId, userId);
    assertEquals(body.date, "2024-06-01");
    assertEquals(body.calories, 2100);
  });

  await t.step("POST / - rejects invalid body", async () => {
    const repo = createMockEntryRepository();
    const app = createApp(repo);

    const req = await authenticatedRequest(
      "http://localhost/entries/",
      userId,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "bad-date", weight: -1, calories: 0 }),
      }
    );
    const res = await app.fetch(req);

    assertEquals(res.status, 400);
  });

  await t.step("POST / - rejects request without JWT", async () => {
    const repo = createMockEntryRepository();
    const app = createApp(repo);

    const req = new Request("http://localhost/entries/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "2024-06-01", weight: 185, calories: 2100 }),
    });
    const res = await app.fetch(req);

    assertEquals(res.status, 401);
  });

  await t.step("GET / - lists entries for authenticated user", async () => {
    const entries = new Map<string, Entry>();
    const entry: Entry = {
      id: "e1",
      userId,
      date: "2024-06-01",
      weight: "185.50",
      calories: 2100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    entries.set("e1", entry);
    const repo = createMockEntryRepository({ entries });
    const app = createApp(repo);

    const req = await authenticatedRequest(
      "http://localhost/entries/",
      userId
    );
    const res = await app.fetch(req);
    const body = await res.json();

    assertEquals(res.status, 200);
    assertEquals(Array.isArray(body), true);
    assertEquals(body.length, 1);
    assertEquals(body[0].id, "e1");
  });

  await t.step("GET /:id - returns a single entry", async () => {
    const entries = new Map<string, Entry>();
    const entry: Entry = {
      id: "e1",
      userId,
      date: "2024-06-01",
      weight: "185.50",
      calories: 2100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    entries.set("e1", entry);
    const repo = createMockEntryRepository({ entries });
    const app = createApp(repo);

    const req = await authenticatedRequest(
      "http://localhost/entries/e1",
      userId
    );
    const res = await app.fetch(req);
    const body = await res.json();

    assertEquals(res.status, 200);
    assertEquals(body.id, "e1");
  });

  await t.step("GET /:id - returns 404 for missing entry", async () => {
    const repo = createMockEntryRepository();
    const app = createApp(repo);

    const req = await authenticatedRequest(
      "http://localhost/entries/nonexistent",
      userId
    );
    const res = await app.fetch(req);

    assertEquals(res.status, 404);
  });

  await t.step("GET /range - returns entries in date range", async () => {
    const entries = new Map<string, Entry>();
    entries.set("e1", {
      id: "e1",
      userId,
      date: "2024-06-01",
      weight: "185.50",
      calories: 2100,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    entries.set("e2", {
      id: "e2",
      userId,
      date: "2024-07-01",
      weight: "184.00",
      calories: 2000,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const repo = createMockEntryRepository({ entries });
    const app = createApp(repo);

    const req = await authenticatedRequest(
      "http://localhost/entries/range?start=2024-06-01&end=2024-06-30",
      userId
    );
    const res = await app.fetch(req);
    const body = await res.json();

    assertEquals(res.status, 200);
    assertEquals(body.length, 1);
    assertEquals(body[0].date, "2024-06-01");
  });

  await t.step("GET /range - rejects missing params", async () => {
    const repo = createMockEntryRepository();
    const app = createApp(repo);

    const req = await authenticatedRequest(
      "http://localhost/entries/range?start=2024-06-01",
      userId
    );
    const res = await app.fetch(req);

    assertEquals(res.status, 400);
  });

  await t.step("PUT /:id - updates an entry", async () => {
    const entries = new Map<string, Entry>();
    entries.set("e1", {
      id: "e1",
      userId,
      date: "2024-06-01",
      weight: "185.50",
      calories: 2100,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const repo = createMockEntryRepository({ entries });
    const app = createApp(repo);

    const req = await authenticatedRequest(
      "http://localhost/entries/e1",
      userId,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calories: 2200 }),
      }
    );
    const res = await app.fetch(req);
    const body = await res.json();

    assertEquals(res.status, 200);
    assertEquals(body.calories, 2200);
  });

  await t.step("PUT /:id - returns 404 for missing entry", async () => {
    const repo = createMockEntryRepository();
    const app = createApp(repo);

    const req = await authenticatedRequest(
      "http://localhost/entries/nonexistent",
      userId,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calories: 2200 }),
      }
    );
    const res = await app.fetch(req);

    assertEquals(res.status, 404);
  });

  await t.step("DELETE /:id - deletes an entry", async () => {
    const entries = new Map<string, Entry>();
    entries.set("e1", {
      id: "e1",
      userId,
      date: "2024-06-01",
      weight: "185.50",
      calories: 2100,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const repo = createMockEntryRepository({ entries });
    const app = createApp(repo);

    const req = await authenticatedRequest(
      "http://localhost/entries/e1",
      userId,
      { method: "DELETE" }
    );
    const res = await app.fetch(req);
    const body = await res.json();

    assertEquals(res.status, 200);
    assertEquals(body.success, true);
  });

  await t.step("DELETE /:id - returns 404 for missing entry", async () => {
    const repo = createMockEntryRepository();
    const app = createApp(repo);

    const req = await authenticatedRequest(
      "http://localhost/entries/nonexistent",
      userId,
      { method: "DELETE" }
    );
    const res = await app.fetch(req);

    assertEquals(res.status, 404);
  });

  resetEnv();
});
