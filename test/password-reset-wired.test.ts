import { describe, expect, it, vi } from "vitest";

vi.mock("pg", () => {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  const connect = vi.fn().mockResolvedValue({ query, release: vi.fn() });

  const PoolMock = vi.fn(function(this: any) {
    this.query = query;
    this.connect = connect;
    this.on = vi.fn();
    this.end = vi.fn();
  });

  return {
    default: { Pool: PoolMock },
    Pool: PoolMock
  };
});

import { app } from "../src/app.js";

const origin = "http://localhost:3001";

describe("Password reset routes are wired", () => {
  it("returns 200 with generic success payload for POST /api/auth/request-password-reset", async () => {
    const res = await app.request("/api/auth/request-password-reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin
      },
      body: JSON.stringify({ email: "test@example.com" })
    });

    expect(res.status).toBe(200);

    const body = await res.json() as { status?: boolean; message?: string };
    expect(body).toMatchObject({
      status: true,
      message: expect.any(String)
    });
  });

  it("returns a 400-series error for POST /api/auth/reset-password without token", async () => {
    const res = await app.request("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin
      },
      body: JSON.stringify({ newPassword: "newpassword" })
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.status).not.toBe(200);
  });

  it("uses current Better Auth route paths and rejects obsolete reset paths", async () => {
    const obsoleteRequestPath = await app.request("/api/auth/reset-password/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin
      },
      body: JSON.stringify({ email: "test@example.com" })
    });

    const obsoleteVerifyPath = await app.request("/api/auth/reset-password/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin
      },
      body: JSON.stringify({ token: "dummy-token" })
    });

    expect(obsoleteRequestPath.status).toBe(404);
    expect(obsoleteVerifyPath.status).toBe(404);
  });
});
