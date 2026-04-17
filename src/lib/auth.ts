import { betterAuth } from "better-auth";
import { openAPI } from "better-auth/plugins";

import { pool } from "./db.js";
import { env } from "./env.js";
import { ipAddressHeaders, rateLimit, trustedOrigins } from "./security.js";

export const auth = betterAuth({
  database: pool,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins,
  rateLimit,
  onAPIError: {
    onError: (error) => {
      console.error("Auth API error", error);
    }
  },
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
  user: {
    additionalFields: {
      role: {
        type: ["user", "admin"],
        required: false,
        defaultValue: "user",
        input: false
      }
    }
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      if (env.NODE_ENV !== "production") {
        console.log("Password Reset Email:", user.email, url);
        return;
      }
      console.log("Password Reset Email queued for:", user.email);
    }
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      if (env.NODE_ENV !== "production") {
        console.log("Verification Email:", user.email, url);
        return;
      }
      console.log("Verification Email queued for:", user.email);
    }
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }
  },
  plugins: [
    openAPI()
  ]
});
