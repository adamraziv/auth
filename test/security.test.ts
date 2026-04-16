import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import * as honoNodeServer from '@hono/node-server';
import pg from 'pg';
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { rateLimit, redactAuthErrorResponse } from "../src/lib/security.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

vi.mock('@hono/node-server', () => ({
  serve: vi.fn(),
}));

vi.mock('pg', () => {
  const PoolMock = vi.fn(function(this: any) {
    this.query = vi.fn().mockResolvedValue({ rows: [] });
    this.connect = vi.fn().mockResolvedValue({ release: vi.fn() });
    this.on = vi.fn();
    this.end = vi.fn();
  });
  return {
    default: { Pool: PoolMock },
    Pool: PoolMock,
  };
});

describe('Security Configuration', () => {
  let serveOptions: any;
  let originalEnv: string | undefined;

  beforeAll(async () => {
    // Force production to test secure cookies behavior
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    await import('../src/index.js');
    serveOptions = vi.mocked(honoNodeServer.serve).mock.calls[0][0];
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should enforce CSRF when Origin is not trusted', async () => {
    // POST request with an untrusted origin
    const req = new Request('http://localhost:3000/api/auth/sign-out', {
      method: 'POST',
      headers: {
        'Origin': 'http://evil-attacker.com',
      },
    });
    
    const res = await serveOptions.fetch(req);
    // Non-2xx regression guard: not.toBeLessThan300.
    expect(res.status).not.toBe(200);
    expect(res.status).not.toBeLessThan(300);
  });

  it('should have credentialed CORS configured before auth routes', async () => {
    // OPTIONS request for preflight
    const req = new Request('http://localhost:3000/api/auth/sign-in/email', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3001',
        'Access-Control-Request-Method': 'POST',
      }
    });
    
    const res = await serveOptions.fetch(req);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });
});

describe("Rate limit policy", () => {
  it("uses database-backed rate limit storage with the global SEC-01 limit", () => {
    expect(rateLimit.enabled).toBe(true);
    expect(rateLimit.storage).toBe("database");
    expect(rateLimit.window).toBe(10);
    expect(rateLimit.max).toBe(100);
  });

  it("defines explicit endpoint rate limit thresholds", () => {
    expect(rateLimit.customRules).toEqual({
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
      "/forget-password": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 3 },
      "/send-verification-email": { window: 60, max: 3 },
      "/get-session": { window: 60, max: 120 },
      "/update-user": { window: 60, max: 30 },
      "/sign-out": { window: 60, max: 30 }
    });
  });

  it("does not configure memory-backed rate limit storage", () => {
    const securityPath = path.resolve(__dirname, "../src/lib/security.ts");
    const content = fs.readFileSync(securityPath, "utf-8");

    expect(content).toContain('storage: "database"');
    expect(content).not.toContain('storage: "memory"');
  });
});

describe("Auth security source policy", () => {
  it("keeps CSRF, origin, secure-cookie, and password-minimum settings locked", () => {
    const authPath = path.resolve(__dirname, "../src/lib/auth.ts");
    const content = fs.readFileSync(authPath, "utf-8");

    expect(content).toContain('useSecureCookies: env.NODE_ENV === "production"');
    expect(content).toContain("minPasswordLength: 8");
    expect(content).toContain("trustedOrigins");
    expect(content).toContain("rateLimit");
    expect(content).not.toContain("disableCSRFCheck");
    expect(content).not.toContain("disableOriginCheck");
  });

  it("keeps auth CORS credentialed and pinned to configured origins", () => {
    const appPath = path.resolve(__dirname, "../src/app.ts");
    const content = fs.readFileSync(appPath, "utf-8");

    expect(content).toContain("credentials: true");
    expect(content).toContain('allowMethods: ["POST", "GET", "OPTIONS"]');
    expect(content).toContain("origin: corsOrigins");
    expect(content).not.toContain('origin: "*"');
    expect(content).not.toContain('Access-Control-Allow-Origin", "*"');
  });

  it("keeps Phase 7 public auth error messages allowlisted", () => {
    const securityPath = path.resolve(__dirname, "../src/lib/security.ts");
    const content = fs.readFileSync(securityPath, "utf-8");
    const publicMessages = [...content.matchAll(/error: "([^"]+)"/g)].map((match) => match[1]);

    expect(publicMessages).toEqual([
      "Authentication failed",
      "Invalid or expired reset link",
      "Too many requests",
      "Internal server error"
    ]);
  });
});

describe("Auth error redaction", () => {
  const sensitiveTerms = ["google", "provider", "token", "postgres", "constraint", "relation", "stack"];

  it("returns generic OAuth errors", async () => {
    const response = await redactAuthErrorResponse(
      new Request("http://localhost:3000/api/auth/callback/google"),
      Response.json({ error: "google provider token stack" }, { status: 400 })
    );

    expect(response.status).toBe(400);
    await expectSafeBody(response, "AUTHENTICATION_FAILED", "Authentication failed", sensitiveTerms);
  });

  it("returns generic reset-password errors", async () => {
    const response = await redactAuthErrorResponse(
      new Request("http://localhost:3000/api/auth/reset-password/confirm?token=expired"),
      Response.json({ error: "expired token postgres relation" }, { status: 400 })
    );

    expect(response.status).toBe(400);
    await expectSafeBody(response, "INVALID_RESET_LINK", "Invalid or expired reset link", sensitiveTerms);
  });

  it("returns generic rate-limit errors", async () => {
    const response = await redactAuthErrorResponse(
      new Request("http://localhost:3000/api/auth/sign-in/email"),
      Response.json({ error: "rate limit provider detail" }, { status: 429 })
    );

    expect(response.status).toBe(429);
    await expectSafeBody(response, "RATE_LIMITED", "Too many requests", sensitiveTerms);
  });

  it("returns generic internal errors", async () => {
    const response = await redactAuthErrorResponse(
      new Request("http://localhost:3000/api/auth/sign-in/email"),
      Response.json({ error: "postgres constraint stack" }, { status: 500 })
    );

    expect(response.status).toBe(500);
    await expectSafeBody(response, "INTERNAL_ERROR", "Internal server error", sensitiveTerms);
  });

  it("passes through non-error responses", async () => {
    const original = Response.json({ ok: true }, { status: 200 });
    const response = await redactAuthErrorResponse(
      new Request("http://localhost:3000/api/auth/sign-in/email"),
      original
    );

    expect(response).toBe(original);
    expect(await response.json()).toEqual({ ok: true });
  });
});

async function expectSafeBody(response: Response, code: string, error: string, deniedTerms: string[]) {
  expect(response.headers.get("content-type")).toContain("application/json");

  const body = await response.text();
  expect(JSON.parse(body)).toEqual({ code, error });

  const lowerBody = body.toLowerCase();
  for (const term of deniedTerms) {
    expect(lowerBody).not.toContain(term);
  }
}
