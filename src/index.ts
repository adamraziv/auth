import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { auth } from "./lib/auth.js";
import { env } from "./lib/env.js";
import { corsOrigins } from "./lib/security.js";
import type { AppVariables } from "./types/hono.js";

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

// Health check endpoint for Docker and monitoring
app.get("/api/auth/ok", (c) => {
  return c.json({
    status: "ok",
    service: "bibot-auth",
    timestamp: new Date().toISOString()
  }, 200);
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.get("/", (c) => c.text("Auth service is healthy"));

serve({
  fetch: app.fetch,
  port: env.PORT
});
