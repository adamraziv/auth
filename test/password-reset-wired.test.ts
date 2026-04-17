import { describe, expect, it, vi } from "vitest";

vi.mock("pg", () => {
  const PoolMock = vi.fn(function(this: any) {
    this.query = vi.fn().mockResolvedValue({ rows: [] });
    this.connect = vi.fn().mockResolvedValue({ release: vi.fn() });
    this.on = vi.fn();
    this.end = vi.fn();
  });

  return {
    default: { Pool: PoolMock },
    Pool: PoolMock
  };
});

import { app } from "../src/app.js";

describe("Password reset plugin wired", () => {
  it("should handle POST /api/auth/request-password-reset", async () => {
    const res = await app.request("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" })
    });

    expect(res.status).not.toBe(404);
  });

  it("should handle POST /api/auth/reset-password", async () => {
    const res = await app.request("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "invalid-token", newPassword: "newpassword" })
    });

    expect(res.status).not.toBe(404);
  });
});
