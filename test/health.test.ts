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

describe('Health Check Endpoint', () => {
  let serveOptions: any;

  beforeAll(async () => {
    // Import index to trigger server setup
    await import('../src/index.js');
    serveOptions = vi.mocked(honoNodeServer.serve).mock.calls[0][0];
  });

  it('should return 200 OK with health status', async () => {
    const res = await serveOptions.fetch(new Request('http://localhost:3000/api/auth/ok'));
    expect(res.status).toBe(200);

    const body = await res.json() as { status: string; service: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(body.service).toBe('bibot-auth');
    expect(body.timestamp).toBeDefined();
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it('should return JSON content type', async () => {
    const res = await serveOptions.fetch(new Request('http://localhost:3000/api/auth/ok'));
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('should return valid ISO 8601 timestamp', async () => {
    const res = await serveOptions.fetch(new Request('http://localhost:3000/api/auth/ok'));
    const body = await res.json() as { timestamp: string };

    // Verify ISO 8601 format
    const timestamp = body.timestamp;
    expect(typeof timestamp).toBe('string');
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    // Verify it's a valid date
    const date = new Date(timestamp);
    expect(date.toISOString()).toBe(timestamp);
  });
});