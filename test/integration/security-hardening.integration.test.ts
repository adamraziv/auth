import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";

import { app } from "../../src/app.js";
import { assertTestDatabaseUrl, closeTestDatabase, resetTestDatabase } from "../helpers/test-db.js";

const origin = "http://localhost:3001";
const baseUrl = "http://localhost:3000";
const migrationMessage = "Run rtk proxy bash -lc 'cd auth && npm run test:db:prepare' to apply the Better Auth rateLimit migration; do not run schema push unless schema files changed.";

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await closeTestDatabase();
  await closeRateLimitPool();
});

describe("security hardening", () => {
  it("returns 429 when sign-up rate limit is exceeded", async () => {
    await assertRateLimitTableExists();

    const responses = await exceedSignUpLimit("203.0.113.77");
    const limited = responses.at(-1);

    expect(limited?.status).toBe(429);

    const body = await limited?.text() ?? "";
    expect(body).toMatch(/RATE_LIMITED|Too many requests/i);
    expectNoSensitiveRateLimitLeak(body);
  });

  it("uses database-backed rate limit storage", async () => {
    const tableName = await assertRateLimitTableExists();

    await exceedSignUpLimit("203.0.113.78");

    const rowCount = await countRows(tableName);
    expect(rowCount).toBeGreaterThan(0);
  });
});

describe("security hardening error redaction", () => {
  it("returns generic OAuth callback errors", async () => {
    const response = await app.fetch(new Request(
      `${baseUrl}/api/auth/callback/google?error=access_denied&error_description=provider-secret-detail`,
      {
        method: "GET",
        headers: { Origin: origin }
      }
    ));

    expect([400, 401]).toContain(response.status);
    const body = await response.text();
    expect(body).toMatch(/Authentication failed|AUTHENTICATION_FAILED/);

    expectNoSensitiveTerms(body, [
      "google",
      "provider-secret-detail",
      "access_denied",
      "error_description",
      "token",
      "stack",
      "postgres",
      "constraint",
      "relation"
    ]);
  });

  it("returns generic invalid reset link errors", async () => {
    const response = await app.fetch(new Request(
      `${baseUrl}/api/auth/reset-password/confirm?token=fake-expired-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin
        },
        body: JSON.stringify({ password: "newpassword123" })
      }
    ));

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);

    const body = await response.text();
    expect(body).toMatch(/Invalid or expired reset link|INVALID_RESET_LINK/);

    expectNoSensitiveTerms(body, [
      "fake-expired-token",
      "expired token",
      "token valid",
      "user",
      "postgres",
      "constraint",
      "relation",
      "stack"
    ]);
  });
});

async function exceedSignUpLimit(forwardedFor: string) {
  const responses: Response[] = [];

  for (let index = 0; index < 6; index += 1) {
    responses.push(await postJson(
      "/api/auth/sign-up/email",
      {
        email: `security-hardening-${Date.now()}-${index}@example.com`,
        password: "password123",
        name: `Security Hardening ${index}`
      },
      forwardedFor
    ));
  }

  return responses;
}

function postJson(path: string, body: unknown, forwardedFor: string) {
  return app.fetch(new Request(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "x-forwarded-for": forwardedFor
    },
    body: JSON.stringify(body)
  }));
}

function expectNoSensitiveRateLimitLeak(body: string) {
  const lowerBody = body.toLowerCase();

  for (const sensitive of ["database", "postgres", "relation", "constraint", "stack", "ratelimit", "rate_limit"]) {
    expect(lowerBody).not.toContain(sensitive);
  }
}

function expectNoSensitiveTerms(body: string, terms: string[]) {
  const lowerBody = body.toLowerCase();

  expect(lowerBody).not.toContain("postgres");
  expect(lowerBody).not.toContain("stack");
  expect(lowerBody).not.toContain("constraint");

  for (const term of terms) {
    expect(lowerBody).not.toContain(term);
  }
}

async function findRateLimitTable() {
  const result = await getPool().query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = current_schema() and table_name in ('rateLimit', 'rate_limit')"
  );

  return result.rows[0]?.table_name as "rateLimit" | "rate_limit" | undefined;
}

async function assertRateLimitTableExists() {
  const tableName = await findRateLimitTable();
  if (!tableName) {
    throw new Error(migrationMessage);
  }

  return tableName;
}

async function countRows(tableName: "rateLimit" | "rate_limit") {
  const result = await getPool().query<{ count: string }>(`select count(*) from "${tableName}"`);
  return Number(result.rows[0]?.count ?? 0);
}

let pool: Pool | null = null;

function getPool() {
  pool ??= new Pool({ connectionString: assertTestDatabaseUrl() });
  return pool;
}

async function closeRateLimitPool() {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = null;
}
