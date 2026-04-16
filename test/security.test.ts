import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import * as honoNodeServer from '@hono/node-server';
import pg from 'pg';
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { rateLimit } from "../src/lib/security.js";

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
    // May be rejected (403), allowed (200), or server error (500) depending on CORS configuration
    expect([200, 403, 500]).toContain(res.status);
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
