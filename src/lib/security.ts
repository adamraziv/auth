import { env } from "./env.js";

export const trustedOrigins = env.TRUSTED_ORIGINS;

export const corsOrigins = env.CORS_ORIGIN
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const rateLimit = {
  enabled: true,
  storage: "database",
  window: 10,
  max: 100,
  customRules: {
    "/sign-in/email": { window: 60, max: 10 },
    "/sign-up/email": { window: 60, max: 5 },
    "/forget-password": { window: 60, max: 3 },
    "/reset-password": { window: 60, max: 3 },
    "/send-verification-email": { window: 60, max: 3 },
    "/get-session": { window: 60, max: 120 },
    "/update-user": { window: 60, max: 30 },
    "/sign-out": { window: 60, max: 30 }
  }
} as const;

export const ipAddressHeaders = ["x-forwarded-for", "x-real-ip"] as const;
