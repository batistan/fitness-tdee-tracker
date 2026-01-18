import { eq, and, desc, between } from "drizzle-orm";
import type { Database } from "../db/client.ts";
import { entries, type Entry, type NewEntry } from "../db/schema.ts";

export interface EntryRepository {
  create(data: NewEntry): Promise<Entry>;
  getById(id: string): Promise<Entry | null>;
  getByUserAndDate(userId: string, date: string): Promise<Entry | null>;
  getByUser(userId: string, options?: { limit?: number; offset?: number }): Promise<Entry[]>;
  getByUserInRange(userId: string, startDate: string, endDate: string): Promise<Entry[]>;
  update(id: string, data: Partial<NewEntry>): Promise<Entry | null>;
  upsert(data: NewEntry): Promise<Entry>;
  delete(id: string): Promise<boolean>;
}

export function createEntryRepository(db: Database): EntryRepository {
  const repository: EntryRepository = {
    async create(data: NewEntry): Promise<Entry> {
      const [entry] = await db.insert(entries).values(data).returning();
      return entry;
    },

    async getById(id: string): Promise<Entry | null> {
      const [entry] = await db.select().from(entries).where(eq(entries.id, id));
      return entry ?? null;
    },

    async getByUserAndDate(userId: string, date: string): Promise<Entry | null> {
      const [entry] = await db
        .select()
        .from(entries)
        .where(and(eq(entries.userId, userId), eq(entries.date, date)));
      return entry ?? null;
    },

    async getByUser(
      userId: string,
      options?: { limit?: number; offset?: number }
    ): Promise<Entry[]> {
      let query = db
        .select()
        .from(entries)
        .where(eq(entries.userId, userId))
        .orderBy(desc(entries.date));

      if (options?.limit) {
        query = query.limit(options.limit) as typeof query;
      }
      if (options?.offset) {
        query = query.offset(options.offset) as typeof query;
      }

      return query;
    },

    async getByUserInRange(
      userId: string,
      startDate: string,
      endDate: string
    ): Promise<Entry[]> {
      return db
        .select()
        .from(entries)
        .where(
          and(
            eq(entries.userId, userId),
            between(entries.date, startDate, endDate)
          )
        )
        .orderBy(desc(entries.date));
    },

    async update(id: string, data: Partial<NewEntry>): Promise<Entry | null> {
      const [entry] = await db
        .update(entries)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(entries.id, id))
        .returning();
      return entry ?? null;
    },

    async upsert(data: NewEntry): Promise<Entry> {
      const existing = await repository.getByUserAndDate(data.userId, data.date);
      if (existing) {
        const updated = await repository.update(existing.id, data);
        return updated!;
      }
      return repository.create(data);
    },

    async delete(id: string): Promise<boolean> {
      const result = await db.delete(entries).where(eq(entries.id, id)).returning();
      return result.length > 0;
    },
  };

  return repository;
}
