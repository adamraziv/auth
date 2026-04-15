import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import * as honoNodeServer from '@hono/node-server';
import pg from 'pg';

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
    console.log(res.status, await res.text());
    // Should be rejected due to CSRF check failing (often 403)
    expect(res.status).toBe(403);
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
