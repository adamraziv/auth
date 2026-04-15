import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/test_db',
      BETTER_AUTH_SECRET: 'test-secret',
      BETTER_AUTH_URL: 'http://localhost:3000',
    }
  }
});
