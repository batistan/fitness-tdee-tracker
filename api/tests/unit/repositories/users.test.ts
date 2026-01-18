import { assertEquals } from "@std/assert";
import { createUserRepository } from "@src/repositories/users.ts";
import { createMockDb } from "@tests/mocks/database.ts";
import type { User } from "@src/db/schema.ts";

const mockUser: User = {
  id: "user-123",
  email: "test@example.com",
  passwordHash: "hashed",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

Deno.test("user repository", async (t) => {
  await t.step("create - returns created user", async () => {
    const db = createMockDb({ returnValue: [mockUser] });
    const repo = createUserRepository(db);

    const result = await repo.create({ email: "test@example.com", passwordHash: "hashed" });

    assertEquals(result, mockUser);
  });

  await t.step("create - passes data to db.insert", async () => {
    let insertedData: unknown = null;
    const db = createMockDb({
      returnValue: [mockUser],
      onInsert: (data) => { insertedData = data; },
    });
    const repo = createUserRepository(db);

    await repo.create({ email: "test@example.com", passwordHash: "hashed" });

    assertEquals(insertedData, { email: "test@example.com", passwordHash: "hashed" });
  });

  await t.step("create - throws on database error", async () => {
    const db = createMockDb({ shouldFail: true, error: new Error("Duplicate email") });
    const repo = createUserRepository(db);

    let threw = false;
    try {
      await repo.create({ email: "test@example.com" });
    } catch (e) {
      threw = true;
      assertEquals((e as Error).message, "Duplicate email");
    }
    assertEquals(threw, true);
  });

  await t.step("getById - returns user when found", async () => {
    const db = createMockDb({ returnValue: [mockUser] });
    const repo = createUserRepository(db);

    const result = await repo.getById("user-123");

    assertEquals(result, mockUser);
  });

  await t.step("getById - returns null when not found", async () => {
    const db = createMockDb({ returnValue: [] });
    const repo = createUserRepository(db);

    const result = await repo.getById("nonexistent");

    assertEquals(result, null);
  });

  await t.step("getByEmail - returns user when found", async () => {
    const db = createMockDb({ returnValue: [mockUser] });
    const repo = createUserRepository(db);

    const result = await repo.getByEmail("test@example.com");

    assertEquals(result, mockUser);
  });

  await t.step("getByEmail - returns null when not found", async () => {
    const db = createMockDb({ returnValue: [] });
    const repo = createUserRepository(db);

    const result = await repo.getByEmail("nonexistent@example.com");

    assertEquals(result, null);
  });

  await t.step("update - returns updated user", async () => {
    const updatedUser = { ...mockUser, email: "new@example.com" };
    const db = createMockDb({ returnValue: [updatedUser] });
    const repo = createUserRepository(db);

    const result = await repo.update("user-123", { email: "new@example.com" });

    assertEquals(result?.email, "new@example.com");
  });

  await t.step("update - returns null when user not found", async () => {
    const db = createMockDb({ returnValue: [] });
    const repo = createUserRepository(db);

    const result = await repo.update("nonexistent", { email: "new@example.com" });

    assertEquals(result, null);
  });

  await t.step("update - sets updatedAt timestamp", async () => {
    let updateData: Record<string, unknown> = {};
    const db = createMockDb({
      returnValue: [mockUser],
      onUpdate: (data) => { updateData = data as Record<string, unknown>; },
    });
    const repo = createUserRepository(db);

    await repo.update("user-123", { email: "new@example.com" });

    assertEquals(updateData.email, "new@example.com");
    assertEquals(updateData.updatedAt instanceof Date, true);
  });

  await t.step("delete - returns true when user deleted", async () => {
    const db = createMockDb({ returnValue: [mockUser] });
    const repo = createUserRepository(db);

    const result = await repo.delete("user-123");

    assertEquals(result, true);
  });

  await t.step("delete - returns false when user not found", async () => {
    const db = createMockDb({ returnValue: [] });
    const repo = createUserRepository(db);

    const result = await repo.delete("nonexistent");

    assertEquals(result, false);
  });
});
