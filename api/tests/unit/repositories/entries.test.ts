import { assertEquals } from "@std/assert";
import { createEntryRepository } from "@src/repositories/entries.ts";
import { createMockDb } from "@tests/mocks/database.ts";
import type { Entry } from "@src/db/schema.ts";

const mockEntry: Entry = {
  id: "entry-123",
  userId: "user-123",
  date: "2024-01-15",
  weight: "185.5",
  calories: 2100,
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-01-15"),
};

Deno.test("entry repository", async (t) => {
  await t.step("create - returns created entry", async () => {
    const db = createMockDb({ returnValue: [mockEntry] });
    const repo = createEntryRepository(db);

    const result = await repo.create({
      userId: "user-123",
      date: "2024-01-15",
      weight: "185.5",
      calories: 2100,
    });

    assertEquals(result, mockEntry);
  });

  await t.step("create - throws on database error", async () => {
    const db = createMockDb({ shouldFail: true, error: new Error("Constraint violation") });
    const repo = createEntryRepository(db);

    let threw = false;
    try {
      await repo.create({ userId: "user-123", date: "2024-01-15", weight: "185.5", calories: 2100 });
    } catch (e) {
      threw = true;
      assertEquals((e as Error).message, "Constraint violation");
    }
    assertEquals(threw, true);
  });

  await t.step("getById - returns entry when found", async () => {
    const db = createMockDb({ returnValue: [mockEntry] });
    const repo = createEntryRepository(db);

    const result = await repo.getById("entry-123");

    assertEquals(result, mockEntry);
  });

  await t.step("getById - returns null when not found", async () => {
    const db = createMockDb({ returnValue: [] });
    const repo = createEntryRepository(db);

    const result = await repo.getById("nonexistent");

    assertEquals(result, null);
  });

  await t.step("getByUserAndDate - returns entry when found", async () => {
    const db = createMockDb({ returnValue: [mockEntry] });
    const repo = createEntryRepository(db);

    const result = await repo.getByUserAndDate("user-123", "2024-01-15");

    assertEquals(result, mockEntry);
  });

  await t.step("getByUserAndDate - returns null when not found", async () => {
    const db = createMockDb({ returnValue: [] });
    const repo = createEntryRepository(db);

    const result = await repo.getByUserAndDate("user-123", "2024-01-15");

    assertEquals(result, null);
  });

  await t.step("getByUser - returns entries for user", async () => {
    const entries = [mockEntry, { ...mockEntry, id: "entry-456", date: "2024-01-14" }];
    const db = createMockDb({ returnValue: entries });
    const repo = createEntryRepository(db);

    const result = await repo.getByUser("user-123");

    assertEquals(result, entries);
  });

  await t.step("getByUser - returns empty array when no entries", async () => {
    const db = createMockDb({ returnValue: [] });
    const repo = createEntryRepository(db);

    const result = await repo.getByUser("user-123");

    assertEquals(result, []);
  });

  await t.step("getByUserInRange - returns entries in date range", async () => {
    const db = createMockDb({ returnValue: [mockEntry] });
    const repo = createEntryRepository(db);

    const result = await repo.getByUserInRange("user-123", "2024-01-01", "2024-01-31");

    assertEquals(result, [mockEntry]);
  });

  await t.step("update - returns updated entry", async () => {
    const updatedEntry = { ...mockEntry, calories: 2200 };
    const db = createMockDb({ returnValue: [updatedEntry] });
    const repo = createEntryRepository(db);

    const result = await repo.update("entry-123", { calories: 2200 });

    assertEquals(result?.calories, 2200);
  });

  await t.step("update - returns null when entry not found", async () => {
    const db = createMockDb({ returnValue: [] });
    const repo = createEntryRepository(db);

    const result = await repo.update("nonexistent", { calories: 2200 });

    assertEquals(result, null);
  });

  await t.step("delete - returns true when entry deleted", async () => {
    const db = createMockDb({ returnValue: [mockEntry] });
    const repo = createEntryRepository(db);

    const result = await repo.delete("entry-123");

    assertEquals(result, true);
  });

  await t.step("delete - returns false when entry not found", async () => {
    const db = createMockDb({ returnValue: [] });
    const repo = createEntryRepository(db);

    const result = await repo.delete("nonexistent");

    assertEquals(result, false);
  });
});
