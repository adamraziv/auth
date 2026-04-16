import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/integration/**/*.integration.test.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgres://postgres:postgres@localhost:5432/bibot_auth_test",
      BETTER_AUTH_SECRET: "test-secret-at-least-32-characters",
      BETTER_AUTH_URL: "http://localhost:3000",
      GOOGLE_CLIENT_ID: "test-client-id",
      GOOGLE_CLIENT_SECRET: "test-client-secret",
      TRUSTED_ORIGINS: "http://localhost:3001",
      CORS_ORIGIN: "http://localhost:3001"
    },
    deps: {
      fallbackCJS: {
        "better-auth": ["better-auth", "better-auth/social-providers", "better-auth/plugins/password-reset"],
        "@better-auth/core": ["@better-auth/core"]
      }
    },
    server: {
      deps: {
        inline: ["better-auth"]
      }
    }
  },
  optimizeDeps: {
    include: ["better-auth", "@better-auth/core"]
  }
});
