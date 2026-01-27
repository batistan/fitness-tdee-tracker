import { Hono } from "hono";
import { type EntryRepository } from "../repositories/entries.ts";
import { getUserId } from "../middleware/auth.ts";
import { calculateTDEE } from "../services/tdee.ts";
import { formatDate } from "@shared/utils/mod.ts";

const DEFAULT_WINDOW_DAYS = 28;

export function createStatsRoute(entryRepo: EntryRepository): Hono {
  return new Hono().get("/tdee", async (c) => {
    const userId = getUserId(c);

    const windowDays =
      Number(c.req.query("days")) || DEFAULT_WINDOW_DAYS;

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - windowDays);

    const entries = await entryRepo.getByUserInRange(
      userId,
      formatDate(start),
      formatDate(end)
    );

    const result = calculateTDEE(entries);
    if (!result) {
      return c.json(
        { error: "Insufficient data", message: `Need at least 3 entries within the last ${windowDays} days` },
        422
      );
    }

    return c.json(result);
  });
}
