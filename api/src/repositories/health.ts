import { sql } from "drizzle-orm";
import type { Database } from "../db/client.ts";

export type HealthCheckResult =
  | { connected: true }
  | { connected: false; error: string };

export interface HealthRepository {
  checkConnection(): Promise<HealthCheckResult>;
}

export function createHealthRepository(db: Database): HealthRepository {
  return {
    async checkConnection(): Promise<HealthCheckResult> {
      try {
        await db.execute(sql`SELECT 1`);
        return { connected: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown database error";
        return { connected: false, error: message };
      }
    },
  };
}
