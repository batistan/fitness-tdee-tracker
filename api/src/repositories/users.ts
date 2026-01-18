import { eq } from "drizzle-orm";
import type { Database } from "../db/client.ts";
import { users, type User, type NewUser } from "../db/schema.ts";

export interface UserRepository {
  create(data: NewUser): Promise<User>;
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  update(id: string, data: Partial<NewUser>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}

export function createUserRepository(db: Database): UserRepository {
  return {
    async create(data: NewUser): Promise<User> {
      const [user] = await db.insert(users).values(data).returning();
      return user;
    },

    async getById(id: string): Promise<User | null> {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user ?? null;
    },

    async getByEmail(email: string): Promise<User | null> {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user ?? null;
    },

    async update(id: string, data: Partial<NewUser>): Promise<User | null> {
      const [user] = await db
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return user ?? null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await db.delete(users).where(eq(users.id, id)).returning();
      return result.length > 0;
    },
  };
}
