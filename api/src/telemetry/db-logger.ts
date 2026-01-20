import type { Logger as DrizzleLogger } from "drizzle-orm";
import { getLogger } from "./logger.ts";

/**
 * Drizzle ORM logger implementation that integrates with our structured logger
 */
export class DatabaseLogger implements DrizzleLogger {
  logQuery(query: string, params: unknown[]): void {
    const logger = getLogger();

    logger.info("Database query", {
      query,
      params,
    });
  }
}

export function createDatabaseLogger(): DatabaseLogger {
  return new DatabaseLogger();
}
