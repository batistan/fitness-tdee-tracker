import { assertEquals } from "@std/assert";
import { createHealthRepository } from "@src/repositories/health.ts";
import { createMockDb } from "@tests/mocks/database.ts";

Deno.test("health repository - checkConnection", async (t) => {
  await t.step("returns connected true when query succeeds", async () => {
    const db = createMockDb();
    const repo = createHealthRepository(db);

    const result = await repo.checkConnection();

    assertEquals(result, { connected: true });
  });

  await t.step("returns connected false with error message when query fails", async () => {
    const db = createMockDb({ shouldFail: true, error: new Error("ECONNREFUSED") });
    const repo = createHealthRepository(db);

    const result = await repo.checkConnection();

    assertEquals(result, { connected: false, error: "ECONNREFUSED" });
  });

  await t.step("handles non-Error exceptions", async () => {
    const db = createMockDb({ shouldFail: true, error: "string error" as unknown as Error });
    const repo = createHealthRepository(db);

    const result = await repo.checkConnection();

    assertEquals(result.connected, false);
  });

  await t.step("calls db.execute", async () => {
    let executeCalled = false;
    const db = createMockDb({ onExecute: () => { executeCalled = true; } });
    const repo = createHealthRepository(db);

    await repo.checkConnection();

    assertEquals(executeCalled, true);
  });
});
