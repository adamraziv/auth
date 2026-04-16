import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/integration/**'],
    env: {
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/test_db',
      BETTER_AUTH_SECRET: 'test-secret',
      BETTER_AUTH_URL: 'http://localhost:3000',
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
    },
    deps: {
      fallbackCJS: {
        'better-auth': ['better-auth', 'better-auth/social-providers', 'better-auth/plugins/password-reset'],
        '@better-auth/core': ['@better-auth/core']
      }
    },
    server: {
      deps: {
        inline: ['better-auth']
      }
    }
  },
  optimizeDeps: {
    include: ['better-auth', '@better-auth/core']
  }
});
