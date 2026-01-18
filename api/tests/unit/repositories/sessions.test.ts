import { assertEquals } from "@std/assert";
import { createSessionRepository } from "@src/repositories/sessions.ts";
import { createMockDb } from "@tests/mocks/database.ts";
import type { Session } from "@src/db/schema.ts";

const mockSession: Session = {
  id: "session-123",
  userId: "user-123",
  refreshToken: "refresh-token-abc",
  expiresAt: new Date("2024-02-01"),
  createdAt: new Date("2024-01-01"),
};

Deno.test("session repository", async (t) => {
  await t.step("create - returns created session", async () => {
    const db = createMockDb({ returnValue: [mockSession] });
    const repo = createSessionRepository(db);

    const result = await repo.create({
      userId: "user-123",
      refreshToken: "refresh-token-abc",
      expiresAt: new Date("2024-02-01"),
    });

    assertEquals(result, mockSession);
  });

  await t.step("create - throws on database error", async () => {
    const db = createMockDb({ shouldFail: true, error: new Error("Insert failed") });
    const repo = createSessionRepository(db);

    let threw = false;
    try {
      await repo.create({
        userId: "user-123",
        refreshToken: "token",
        expiresAt: new Date(),
      });
    } catch (e) {
      threw = true;
      assertEquals((e as Error).message, "Insert failed");
    }
    assertEquals(threw, true);
  });

  await t.step("getByToken - returns session when found and not expired", async () => {
    const db = createMockDb({ returnValue: [mockSession] });
    const repo = createSessionRepository(db);

    const result = await repo.getByToken("refresh-token-abc");

    assertEquals(result, mockSession);
  });

  await t.step("getByToken - returns null when not found", async () => {
    const db = createMockDb({ returnValue: [] });
    const repo = createSessionRepository(db);

    const result = await repo.getByToken("nonexistent-token");

    assertEquals(result, null);
  });

  await t.step("delete - returns true when session deleted", async () => {
    const db = createMockDb({ returnValue: [mockSession] });
    const repo = createSessionRepository(db);

    const result = await repo.delete("session-123");

    assertEquals(result, true);
  });

  await t.step("delete - returns false when session not found", async () => {
    const db = createMockDb({ returnValue: [] });
    const repo = createSessionRepository(db);

    const result = await repo.delete("nonexistent");

    assertEquals(result, false);
  });

  await t.step("deleteByUser - returns count of deleted sessions", async () => {
    const sessions = [mockSession, { ...mockSession, id: "session-456" }];
    const db = createMockDb({ returnValue: sessions });
    const repo = createSessionRepository(db);

    const result = await repo.deleteByUser("user-123");

    assertEquals(result, 2);
  });

  await t.step("deleteByUser - returns 0 when no sessions found", async () => {
    const db = createMockDb({ returnValue: [] });
    const repo = createSessionRepository(db);

    const result = await repo.deleteByUser("user-123");

    assertEquals(result, 0);
  });
});
