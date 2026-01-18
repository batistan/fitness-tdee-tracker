import type { HealthRepository, HealthCheckResult } from "../../src/repositories/health.ts";
import type { UserRepository } from "../../src/repositories/users.ts";
import type { EntryRepository } from "../../src/repositories/entries.ts";
import type { SessionRepository } from "../../src/repositories/sessions.ts";
import type { User, Entry, Session } from "../../src/db/schema.ts";

export function createMockHealthRepository(
  result: HealthCheckResult = { connected: true }
): HealthRepository & { _setResult: (r: HealthCheckResult) => void } {
  let currentResult = result;
  return {
    checkConnection: async () => currentResult,
    _setResult: (r: HealthCheckResult) => { currentResult = r; },
  };
}

export function createMockUserRepository(options: {
  users?: Map<string, User>;
} = {}): UserRepository {
  const users = options.users ?? new Map<string, User>();

  return {
    async create(data) {
      const user: User = {
        id: crypto.randomUUID(),
        email: data.email,
        passwordHash: data.passwordHash ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      users.set(user.id, user);
      return user;
    },
    async getById(id) {
      return users.get(id) ?? null;
    },
    async getByEmail(email) {
      return Array.from(users.values()).find((u) => u.email === email) ?? null;
    },
    async update(id, data) {
      const user = users.get(id);
      if (!user) return null;
      const updated = { ...user, ...data, updatedAt: new Date() };
      users.set(id, updated);
      return updated;
    },
    async delete(id) {
      return users.delete(id);
    },
  };
}

export function createMockEntryRepository(options: {
  entries?: Map<string, Entry>;
} = {}): EntryRepository {
  const entries = options.entries ?? new Map<string, Entry>();

  return {
    async create(data) {
      const entry: Entry = {
        id: crypto.randomUUID(),
        userId: data.userId,
        date: data.date,
        weight: data.weight.toString(),
        calories: data.calories,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      entries.set(entry.id, entry);
      return entry;
    },
    async getById(id) {
      return entries.get(id) ?? null;
    },
    async getByUserAndDate(userId, date) {
      return Array.from(entries.values()).find(
        (e) => e.userId === userId && e.date === date
      ) ?? null;
    },
    async getByUser(userId, options) {
      let result = Array.from(entries.values())
        .filter((e) => e.userId === userId)
        .sort((a, b) => b.date.localeCompare(a.date));
      if (options?.offset) result = result.slice(options.offset);
      if (options?.limit) result = result.slice(0, options.limit);
      return result;
    },
    async getByUserInRange(userId, startDate, endDate) {
      return Array.from(entries.values())
        .filter((e) => e.userId === userId && e.date >= startDate && e.date <= endDate)
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    async update(id, data) {
      const entry = entries.get(id);
      if (!entry) return null;
      const updated = {
        ...entry,
        ...data,
        weight: data.weight?.toString() ?? entry.weight,
        updatedAt: new Date(),
      };
      entries.set(id, updated);
      return updated;
    },
    async upsert(data) {
      const existing = await this.getByUserAndDate(data.userId, data.date);
      if (existing) {
        return (await this.update(existing.id, data))!;
      }
      return this.create(data);
    },
    async delete(id) {
      return entries.delete(id);
    },
  };
}

export function createMockSessionRepository(options: {
  sessions?: Map<string, Session>;
} = {}): SessionRepository {
  const sessions = options.sessions ?? new Map<string, Session>();

  return {
    async create(data) {
      const session: Session = {
        id: crypto.randomUUID(),
        userId: data.userId,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        createdAt: new Date(),
      };
      sessions.set(session.id, session);
      return session;
    },
    async getByToken(refreshToken) {
      const session = Array.from(sessions.values()).find(
        (s) => s.refreshToken === refreshToken && s.expiresAt > new Date()
      );
      return session ?? null;
    },
    async delete(id) {
      return sessions.delete(id);
    },
    async deleteByUser(userId) {
      let count = 0;
      for (const [id, session] of sessions) {
        if (session.userId === userId) {
          sessions.delete(id);
          count++;
        }
      }
      return count;
    },
  };
}
