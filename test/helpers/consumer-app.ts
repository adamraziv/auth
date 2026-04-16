import { Hono } from "hono";

export type ConsumerAppOptions = {
  authBaseUrl: string;
  fetchAuth?: typeof fetch;
};

export function createConsumerApp(options: ConsumerAppOptions): Hono {
  const app = new Hono();

  app.get("/consumer/me", async (c) => {
    const headers = new Headers();
    const cookie = c.req.header("Cookie");
    const authorization = c.req.header("Authorization");

    if (cookie) {
      headers.set("Cookie", cookie);
    }

    if (authorization) {
      headers.set("Authorization", authorization);
    }

    const authResponse = await (options.fetchAuth ?? fetch)(
      new URL("/api/auth/get-session", options.authBaseUrl),
      {
        method: "GET",
        headers
      }
    );

    const body: unknown = await authResponse.json().catch(() => null);

    if (authResponse.status === 401 || !hasUser(body)) {
      return c.json({ authenticated: false }, 401);
    }

    return c.json({ authenticated: true, user: body.user }, 200);
  });

  return app;
}

function hasUser(body: unknown): body is { user: unknown } {
  return typeof body === "object" && body !== null && "user" in body && Boolean(body.user);
}
