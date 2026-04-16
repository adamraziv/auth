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

describe("reusable Hono app export", () => {
  it("exports the auth app without starting the server", async () => {
    const { app } = await import("../src/app.js");

    const res = await app.fetch(new Request("http://localhost:3000/api/auth/ok"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      status: "ok",
      service: "bibot-auth"
    });
  });
});
