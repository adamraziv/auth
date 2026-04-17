import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const securityDocsPath = path.resolve(__dirname, "../docs/SECURITY.md");
const readmePath = path.resolve(__dirname, "../README.md");

function readSecurityDocs() {
  return fs.readFileSync(securityDocsPath, "utf-8");
}

function readReadme() {
  return fs.readFileSync(readmePath, "utf-8");
}

describe("Security posture docs", () => {
  it("documents all public rate limits", () => {
    const content = readSecurityDocs();

    expect(content).toContain("Global auth limit: 100 requests per 10 seconds");
    expect(content).toContain("/sign-in/email: 10 requests per 60 seconds");
    expect(content).toContain("/sign-up/email: 5 requests per 60 seconds");
    expect(content).toContain("/forget-password: 3 requests per 60 seconds");
    expect(content).toContain("/request-password-reset: 3 requests per 60 seconds");
    expect(content).toContain("/reset-password: 3 requests per 60 seconds");
    expect(content).toContain("/send-verification-email: 3 requests per 60 seconds");
    expect(content).toContain("/get-session: 120 requests per 60 seconds");
    expect(content).toContain("/update-user: 30 requests per 60 seconds");
    expect(content).toContain("/sign-out: 30 requests per 60 seconds");
    expect(content).toContain("database-backed storage");
  });

  it("documents secure cookie and session behavior", () => {
    const content = readSecurityDocs();

    expect(content).toContain("HTTPS is required in production");
    expect(content).toContain("NODE_ENV=production");
    expect(content).toContain("maxAge: 300");
    expect(content).toContain("GET /api/auth/get-session");
    expect(content).toContain("forwarding the incoming `Cookie` header");
  });

  it("documents CORS origin and CSRF requirements", () => {
    const content = readSecurityDocs();

    expect(content).toContain("TRUSTED_ORIGINS");
    expect(content).toContain("CORS_ORIGIN");
    expect(content).toContain("credentials: include");
    expect(content).toContain("disableCSRFCheck");
    expect(content).toContain("disableOriginCheck");
    expect(content).toContain("not used");
  });

  it("documents approved public error responses", () => {
    const content = readSecurityDocs();

    expect(content).toContain("AUTHENTICATION_FAILED - Authentication failed");
    expect(content).toContain("INVALID_RESET_LINK - Invalid or expired reset link");
    expect(content).toContain("RATE_LIMITED - Too many requests");
    expect(content).toContain("INTERNAL_ERROR - Internal server error");
    expect(content).toContain("Detailed diagnostics are server logs only");
    expect(content).toContain("Redirect-style OAuth and password-reset errors are redacted before reaching clients");
  });

  it("README links to security posture", () => {
    const content = readReadme();

    expect(content).toContain("[docs/SECURITY.md](docs/SECURITY.md)");
  });

  it("does not document unsupported consumer patterns", () => {
    const content = readSecurityDocs();

    expect(content).not.toContain("avatarUrl");
    expect(content).not.toContain("JWT session tokens");
    expect(content).not.toContain("disable CSRF for local dev");
    expect(content).not.toContain("SELECT * FROM session");
    expect(content).toContain("must not read the auth PostgreSQL database directly");
  });
});
