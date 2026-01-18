import { eq, and, gt } from "drizzle-orm";
import type { Database } from "../db/client.ts";
import { sessions, type Session, type NewSession } from "../db/schema.ts";

export interface SessionRepository {
  create(data: NewSession): Promise<Session>;
  getByToken(refreshToken: string): Promise<Session | null>;
  delete(id: string): Promise<boolean>;
  deleteByUser(userId: string): Promise<number>;
}

export function createSessionRepository(db: Database): SessionRepository {
  return {
    async create(data: NewSession): Promise<Session> {
      const [session] = await db.insert(sessions).values(data).returning();
      return session;
    },

    async getByToken(refreshToken: string): Promise<Session | null> {
      const [session] = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.refreshToken, refreshToken),
            gt(sessions.expiresAt, new Date())
          )
        );
      return session ?? null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await db.delete(sessions).where(eq(sessions.id, id)).returning();
      return result.length > 0;
    },

    async deleteByUser(userId: string): Promise<number> {
      const result = await db.delete(sessions).where(eq(sessions.userId, userId)).returning();
      return result.length;
    },
  };
}
