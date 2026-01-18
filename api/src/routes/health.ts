import { Hono } from "hono";
import { getEnv } from "../config/env.ts";
import { type HealthRepository } from "../repositories/health.ts";

interface HealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  environment: string;
  database: "connected" | "disconnected";
  databaseError?: string;
}

export function createHealthRoute(healthRepo: HealthRepository): Hono {
  return new Hono().get("/", async (c) => {
    const env = getEnv();
    const dbCheck = await healthRepo.checkConnection();

    const response: HealthResponse = {
      status: dbCheck.connected ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      environment: env.ENVIRONMENT,
      database: dbCheck.connected ? "connected" : "disconnected",
      databaseError: dbCheck.connected ? undefined : dbCheck.error,
    };

    return c.json(response);
  });
}
