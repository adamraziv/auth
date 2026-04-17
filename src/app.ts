import { Hono } from "hono";
import { cors } from "hono/cors";
import { openAPI } from "better-auth/plugins";

import { auth } from "./lib/auth.js";
import { corsOrigins, redactAuthErrorResponse } from "./lib/security.js";
import type { AppVariables } from "./types/hono.js";

const TAG_GROUPS = [
  {
    name: "Authentication",
    tags: ["sign-in", "sign-up", "sign-out", "verify-email", "change-password", "reset-password", "forgot-password", "request-password-reset", "verify-password", "send-verification-email"]
  },
  {
    name: "Session & Security",
    tags: ["get-session", "get-access-token", "refresh-token", "revoke-session", "revoke-sessions", "revoke-other-sessions", "update-session"]
  },
  {
    name: "User Management",
    tags: ["user", "update-user", "change-email"]
  },
  {
    name: "Account & Links",
    tags: ["account", "list-accounts", "link-social", "unlink-account", "callback"]
  },
  {
    name: "Admin",
    tags: ["admin", "list-users"]
  },
  {
    name: "Verification",
    tags: ["verification"]
  }
];

function transformOpenAPISchema(schema: any) {
  const paths = schema.paths || {};
  const updatedPaths: Record<string, any> = {};
  const tagSet = new Set<string>();

  for (const [path, methods] of Object.entries(paths)) {
    const updatedMethods: Record<string, any> = {};
    for (const [method, details] of Object.entries(methods as Record<string, any>)) {
      const d = details as any;
      const originalTags = d.tags || ["Default"];
      let newTag = originalTags[0];

      // Determine new tag first
      if (path.includes("sign-in")) newTag = "sign-in";
      else if (path.includes("sign-up")) newTag = "sign-up";
      else if (path.includes("sign-out")) newTag = "sign-out";
      else if (path.includes("verify-password")) newTag = "sign-in";
      else if (path.includes("send-verification-email")) newTag = "verification";
      else if (path.includes("verify-email")) newTag = "sign-in";
      else if (path.includes("verify")) newTag = "verification";
      else if (path.includes("session")) newTag = "get-session";
      else if (path.includes("refresh-token")) newTag = "get-session";
      else if (path.includes("revoke-")) newTag = "get-session";
      else if (path.includes("update-session")) newTag = "get-session";
      else if (path.includes("user") && !path.includes("delete")) newTag = "user";
      else if (path.includes("update-user")) newTag = "user";
      else if (path.includes("account")) newTag = "account";
      else if (path.includes("list-accounts")) newTag = "account";
      else if (path.includes("link-")) newTag = "link-social";
      else if (path.includes("unlink-")) newTag = "link-social";
      else if (path.includes("callback") && !path.includes("delete")) newTag = "callback";
      else if (path.includes("delete-user/callback")) newTag = "callback";
      else if (path.includes("change-password")) newTag = "sign-in";
      else if (path.includes("reset-password")) newTag = "sign-in";
      else if (path.includes("request-password-reset")) newTag = "sign-in";
      else if (path.includes("get-access-token")) newTag = "get-session";
      else if (path.includes("change-email")) newTag = "user";

      // Only add the final tag
      tagSet.add(newTag);
      updatedMethods[method] = { ...d, tags: [newTag] };
    }
    updatedPaths[path] = updatedMethods;
  }

  const existingTags = Array.from(tagSet);
  const tags = existingTags.map(name => {
    const group = TAG_GROUPS.find(g => g.tags.includes(name));
    return {
      name,
      description: group ? `${group.name} operations` : `${name} operations`
    };
  });

  return {
    ...schema,
    paths: updatedPaths,
    "x-tagGroups": TAG_GROUPS,
    tags
  };
}

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

app.get("/", (c) => c.text("Auth service is healthy"));

app.get("/api/auth/ok", (c) => {
  return c.json({
    status: "ok",
    service: "bibot-auth",
    timestamp: new Date().toISOString()
  }, 200);
});

app.get("/api/auth/open-api/generate-schema", async (c) => {
  const schema = await auth.api.generateOpenAPISchema();
  const transformed = transformOpenAPISchema(schema);
  return c.json(transformed);
});

app.get("/api/auth/reference", async (c) => {
  const schema = await auth.api.generateOpenAPISchema();
  const transformed = transformOpenAPISchema(schema);
  const html = `<!doctype html>
<html>
  <head>
    <title>BiBot Auth API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" type="application/json">${JSON.stringify(transformed)}<\/script>
    <script>
      var configuration = {
        theme: "default",
        metaData: {
          title: "BiBot Auth API",
          description: "API Reference for BiBot Authentication Service",
        }
      }
      document.getElementById('api-reference').dataset.configuration = JSON.stringify(configuration)
    <\/script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"><\/script>
  </body>
</html>`;
  return c.body(html, {
    headers: { "content-type": "text/html" }
  });
});

app.on(["POST", "GET"], "/api/auth/*", async (c) => redactAuthErrorResponse(c.req.raw, await auth.handler(c.req.raw)));

export { app };
