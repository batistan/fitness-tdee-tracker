import { Hono } from "hono";
import { type EntryRepository } from "../repositories/entries.ts";
import { getUserId } from "../middleware/auth.ts";
import { createEntrySchema, updateEntrySchema } from "@shared/schemas/mod.ts";

export function createEntriesRoute(entryRepo: EntryRepository): Hono {
  return new Hono()
    .post("/", async (c) => {
      const userId = getUserId(c);

      const body = await c.req.json();
      const parsed = createEntrySchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
      }

      const entry = await entryRepo.upsert({
        userId,
        date: parsed.data.date,
        weight: parsed.data.weight.toString(),
        calories: parsed.data.calories,
      });

      return c.json(entry, 201);
    })

    .get("/range", async (c) => {
      const userId = getUserId(c);

      const start = c.req.query("start");
      const end = c.req.query("end");
      if (!start || !end) {
        return c.json({ error: "Missing start or end query parameter" }, 400);
      }

      const entries = await entryRepo.getByUserInRange(userId, start, end);
      return c.json(entries);
    })

    .get("/:id", async (c) => {
      const id = c.req.param("id");
      const entry = await entryRepo.getById(id);

      if (!entry) {
        return c.json({ error: "Entry not found" }, 404);
      }

      return c.json(entry);
    })

    .get("/", async (c) => {
      const userId = getUserId(c);

      const limit = Number(c.req.query("limit")) || 50;
      const offset = Number(c.req.query("offset")) || 0;

      const entries = await entryRepo.getByUser(userId, { limit, offset });
      return c.json(entries);
    })

    .put("/:id", async (c) => {
      const id = c.req.param("id");

      const body = await c.req.json();
      const parsed = updateEntrySchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
      }

      const updateData: Record<string, unknown> = {};
      if (parsed.data.date !== undefined) updateData.date = parsed.data.date;
      if (parsed.data.weight !== undefined) updateData.weight = parsed.data.weight.toString();
      if (parsed.data.calories !== undefined) updateData.calories = parsed.data.calories;

      const entry = await entryRepo.update(id, updateData);
      if (!entry) {
        return c.json({ error: "Entry not found" }, 404);
      }

      return c.json(entry);
    })

    .delete("/:id", async (c) => {
      const id = c.req.param("id");
      const deleted = await entryRepo.delete(id);

      if (!deleted) {
        return c.json({ error: "Entry not found" }, 404);
      }

      return c.json({ success: true });
    });
}
