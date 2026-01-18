type Environment = "development" | "qa" | "production";

interface EnvConfig {
  ENVIRONMENT: Environment;
  PORT: number;
  CORS_ORIGIN: string;
  LOG_PAYLOADS: boolean;
  DATABASE_URL: string;
}

const configs: Record<Environment, Omit<EnvConfig, "ENVIRONMENT" | "DATABASE_URL">> = {
  development: {
    PORT: 8000,
    CORS_ORIGIN: "http://localhost:3000",
    LOG_PAYLOADS: true,
  },
  qa: {
    PORT: 8000,
    CORS_ORIGIN: "https://calometri-web-qa.deno.dev",
    LOG_PAYLOADS: true,
  },
  production: {
    PORT: 8000,
    CORS_ORIGIN: "https://calometri-web.deno.dev",
    LOG_PAYLOADS: false,
  },
};

export function getEnv(): EnvConfig {
  const envName = (Deno.env.get("ENVIRONMENT") || "development") as Environment;

  if (!configs[envName]) {
    throw new Error(`Unknown environment: ${envName}`);
  }

  const databaseUrl = Deno.env.get("DATABASE_URL");
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  return {
    ENVIRONMENT: envName,
    DATABASE_URL: databaseUrl,
    ...configs[envName],
    PORT: Number(Deno.env.get("PORT")) || configs[envName].PORT,
    CORS_ORIGIN: Deno.env.get("CORS_ORIGIN") || configs[envName].CORS_ORIGIN,
  };
}
