import { env } from "./env.js";

export const trustedOrigins = env.TRUSTED_ORIGINS;

export const corsOrigins = env.CORS_ORIGIN
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const rateLimit = {
  enabled: true,
  window: 10,
  max: 100,
  customRules: {
    "/sign-in/email": {
      window: 10,
      max: 100
    }
  }
} as const;

export const ipAddressHeaders = ["x-forwarded-for", "x-real-ip"] as const;
