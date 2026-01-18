import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema.ts";
import { getEnv } from "../config/env.ts";

export type Database = NeonHttpDatabase<typeof schema>;

export function createDatabase(connectionString: string): Database {
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

let _db: Database | null = null;

export function getDatabase(): Database {
  if (!_db) {
    const env = getEnv();
    _db = createDatabase(env.DATABASE_URL);
  }
  return _db;
}

export function resetDatabase(): void {
  _db = null;
}
