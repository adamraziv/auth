import { describe, expect, it } from "vitest";

import { createConsumerApp } from "./helpers/consumer-app.js";

describe("consumer app helper", () => {
  it("validates sessions over the auth HTTP get-session endpoint", async () => {
    const calls: Array<{ url: string; cookie: string | null; authorization: string | null }> = [];
    const consumer = createConsumerApp({
      authBaseUrl: "http://auth.local",
      fetchAuth: async (input, init) => {
        const request = new Request(input, init);
        calls.push({
          url: request.url,
          cookie: request.headers.get("Cookie"),
          authorization: request.headers.get("Authorization")
        });

        return Response.json({
          user: {
            id: "user-1",
            email: "consumer@example.com",
            name: "Consumer User",
            image: null,
            role: "user"
          }
        });
      }
    });

    const res = await consumer.request("/consumer/me", {
      headers: {
        Cookie: "better-auth.session_token=abc",
        Authorization: "Bearer token"
      }
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      authenticated: true,
      user: {
        id: "user-1",
        email: "consumer@example.com",
        name: "Consumer User",
        image: null,
        role: "user"
      }
    });
    expect(calls).toEqual([
      {
        url: "http://auth.local/api/auth/get-session",
        cookie: "better-auth.session_token=abc",
        authorization: "Bearer token"
      }
    ]);
  });

  it("rejects missing sessions without exposing auth response details", async () => {
    const consumer = createConsumerApp({
      authBaseUrl: "http://auth.local",
      fetchAuth: async () => Response.json(null)
    });

    const res = await consumer.request("/consumer/me");

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ authenticated: false });
  });
});
