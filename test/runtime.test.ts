import { describe, it, expect, vi, beforeAll } from 'vitest';
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

describe('Hono and Better Auth Runtime', () => {
  let serveOptions: any;

  beforeAll(async () => {
    // Import index to trigger server setup
    await import('../src/index.js');
    serveOptions = vi.mocked(honoNodeServer.serve).mock.calls[0][0];
  });

  it('should use pg.Pool for database connection', async () => {
    expect(pg.Pool).toHaveBeenCalled();
    const config = vi.mocked(pg.Pool).mock.calls[0][0];
    expect(config).toHaveProperty('connectionString', 'postgres://postgres:postgres@localhost:5432/test_db');
  });

  it('should mount Better Auth and serve health check', async () => {
    const req = new Request('http://localhost:3000/');
    const res = await serveOptions.fetch(req);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Auth service is healthy');
  });

  it('should handle /api/auth/* routes via Better Auth', async () => {
    // A known Better Auth route
    const req = new Request('http://localhost:3000/api/auth/error');
    const res = await serveOptions.fetch(req);
    // Better auth intercepts it. Even if mock DB fails, it should return a non-404 JSON/400 error.
    expect(res.status).not.toBe(404);
  });
});
