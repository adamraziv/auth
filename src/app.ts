import { Hono } from "hono";
import { cors } from "hono/cors";
import { openAPI } from "better-auth/plugins";
import { Scalar } from "@scalar/hono-api-reference";

import { auth } from "./lib/auth.js";
import { corsOrigins, redactAuthErrorResponse } from "./lib/security.js";
import type { AppVariables } from "./types/hono.js";

const openAPIDoc = openAPI({ path: "/api/auth/reference" });
const { openAPIReference } = openAPIDoc.endpoints;

const app = new Hono<{ Variables: AppVariables }>();

app.use(
  "/api/auth/*",
  cors({
    origin: corsOrigins,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    credentials: true
  })
);

app.get("/api/auth/ok", (c) => {
  return c.json({
    status: "ok",
    service: "bibot-auth",
    timestamp: new Date().toISOString()
  }, 200);
});

app.on(["POST", "GET"], "/api/auth/*", async (c) => redactAuthErrorResponse(c.req.raw, await auth.handler(c.req.raw)));

app.get("/", (c) => c.text("Auth service is healthy"));

app.get("/api/auth/open-api/generate-schema", async (c) => {
  const schema = await auth.api.generateOpenAPISchema();
  return c.json(schema);
});

app.get("/api/auth/reference", async (c) => {
  const html = await openAPIReference.handler(
    new Request(c.req.url),
    { logger: console }
  );
  return c.body(html.text(), {
    headers: { "content-type": "text/html" }
  });
});

app.get("/docs", Scalar({
  pageTitle: "Bibot Auth API Reference",
  spec: {
    url: "/api/auth/open-api/generate-schema"
  }
}));

export { app };
