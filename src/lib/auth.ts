import { betterAuth } from "better-auth";

import { pool } from "./db.js";
import { env } from "./env.js";
import { ipAddressHeaders, rateLimit, trustedOrigins } from "./security.js";

export const auth = betterAuth({
  database: pool,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins,
  rateLimit,
  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    ipAddress: {
      ipAddressHeaders: [...ipAddressHeaders]
    }
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 300,
      strategy: "compact"
    }
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ url }) => {
      console.log("Verification Email:", url);
    }
  }
});
