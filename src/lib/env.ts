const requiredEnvVars = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET"
] as const;

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const parsedPort = Number.parseInt(process.env.PORT ?? "3000", 10);

if (!Number.isFinite(parsedPort)) {
  throw new Error("Invalid PORT value. PORT must be a number.");
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parsedPort,
  DATABASE_URL: process.env.DATABASE_URL!,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL!,
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3001",
  TRUSTED_ORIGINS: (process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!
};
