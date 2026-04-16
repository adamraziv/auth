import { describe, it, expect, vi, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as honoNodeServer from "@hono/node-server";
import pg from "pg";

vi.mock("@hono/node-server", () => ({
  serve: vi.fn(),
}));

vi.mock("pg", () => {
  const PoolMock = vi.fn(function (this: any) {
    this.connect = vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [], command: "SELECT", rowCount: 0 }),
      release: vi.fn(),
    });
    this.query = vi.fn().mockResolvedValue({ rows: [], command: "SELECT", rowCount: 0 });
    this.on = vi.fn();
    this.end = vi.fn();
  });
  return {
    default: { Pool: PoolMock },
    Pool: PoolMock,
  };
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("User profile and session contract", () => {
  let serveOptions: any;

  beforeAll(async () => {
    await import("../src/index.js");
    serveOptions = vi.mocked(honoNodeServer.serve).mock.calls[0][0];
  });

  // Test 1: auth/src/lib/auth.ts contains role configuration with proper constraints
  it("should include role in user additionalFields with enum values, default, and input: false", () => {
    const authPath = path.resolve(__dirname, "../src/lib/auth.ts");
    const content = fs.readFileSync(authPath, "utf-8");

    // Check for additionalFields
    expect(content).toContain("additionalFields");
    // Check for role field
    expect(content).toContain("role:");
    // Check for type enum values
    expect(content).toContain('type: ["user", "admin"]');
    // Check for default value
    expect(content).toContain('defaultValue: "user"');
    // Check for input: false to prevent client-side role assignment
    expect(content).toContain("input: false");
  });

  // Test 2: auth/src/types/auth-contract.ts contains public session/user/role contract exports
  it("should export PublicSession, PublicUser, PublicSessionRecord, PublicRole, and PublicSessionValidationResponse", () => {
    const contractPath = path.resolve(__dirname, "../src/types/auth-contract.ts");
    
    // This file should not exist yet - this is the RED phase
    expect(fs.existsSync(contractPath)).toBe(true);
    
    const content = fs.readFileSync(contractPath, "utf-8");
    
    // Check for PublicSession export from auth.$Infer.Session
    expect(content).toContain("export type PublicSession = typeof auth.$Infer.Session");
    // Check for PublicUser derived from PublicSession
    expect(content).toContain("export type PublicUser = PublicSession");
    // Check for PublicSessionRecord derived from session
    expect(content).toContain("export type PublicSessionRecord = PublicSession");
    // Check for PublicRole with enum values
    expect(content).toContain('export type PublicRole = "user" | "admin"');
    // Check for PublicSessionValidationResponse
    expect(content).toContain("export type PublicSessionValidationResponse = PublicSession | null");
  });

  // Test 3: auth/src/types/hono.ts uses the public contract types with nullable context
  it("should use PublicUser | null and PublicSessionRecord | null in AppVariables", () => {
    const honoPath = path.resolve(__dirname, "../src/types/hono.ts");
    const content = fs.readFileSync(honoPath, "utf-8");

    // Check for PublicUser nullable
    expect(content).toContain("PublicUser | null");
    // Check for PublicSessionRecord nullable
    expect(content).toContain("PublicSessionRecord | null");
  });
});

describe("Better Auth mounted profile and session routes", () => {
  let serveOptions: any;

  beforeAll(async () => {
    serveOptions = vi.mocked(honoNodeServer.serve).mock.calls[0][0];
  });

  // Test 1: GET /api/auth/get-session with trusted origin and no cookie returns a Better Auth unauthenticated response status accepted by current runtime
  it("should return a valid Better Auth response for get-session endpoint", async () => {
    const req = new Request("http://localhost:3000/api/auth/get-session", {
      method: "GET",
      headers: {
        Origin: "http://localhost:3001",
      },
    });

    const res = await serveOptions.fetch(req);
    // Accept any valid Better Auth response status - 200 (authenticated session) or 401 (no session)
    expect([200, 401]).toContain(res.status);
  });

  // Test 2: POST /api/auth/update-user with name and image is handled by the Better Auth mount and does not return 404
  it("should handle update-user request and not return 404", async () => {
    const req = new Request("http://localhost:3000/api/auth/update-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3001",
      },
      body: JSON.stringify({
        name: "Updated Name",
        image: "https://example.com/avatar.png",
      }),
    });

    const res = await serveOptions.fetch(req);
    // Should be handled by Better Auth - not 404
    expect(res.status).not.toBe(404);
  });

  // Test 3: POST /api/auth/sign-out is handled by the Better Auth mount and does not return 404
  it("should handle sign-out request and not return 404", async () => {
    const req = new Request("http://localhost:3000/api/auth/sign-out", {
      method: "POST",
      headers: {
        Origin: "http://localhost:3001",
      },
    });

    const res = await serveOptions.fetch(req);
    // Should be handled by Better Auth - not 404
    expect(res.status).not.toBe(404);
  });

  // Test 4: A TypeScript-only import from auth-contract.js compiles for PublicSessionValidationResponse
  it("should have PublicSessionValidationResponse type available for route docs", async () => {
    // This test verifies the type exists by checking the file contents
    const contractPath = path.resolve(__dirname, "../src/types/auth-contract.ts");
    const content = fs.readFileSync(contractPath, "utf-8");
    expect(content).toContain("PublicSessionValidationResponse");
  });
});

describe("Session validation boundary", () => {
  let serveOptions: any;

  beforeAll(async () => {
    serveOptions = vi.mocked(honoNodeServer.serve).mock.calls[0][0];
  });

  // Security regression: auth/src/index.ts should have the Better Auth wildcard mount
  it("should have Better Auth wildcard mount at /api/auth/*", () => {
    const indexPath = path.resolve(__dirname, "../src/index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");
    // Verify the mount pattern exists
    expect(content).toContain('app.on(["POST", "GET"], "/api/auth/*"');
  });

  // Security regression: no custom session validation route
  it("should NOT have a custom /api/session/validate route", () => {
    const indexPath = path.resolve(__dirname, "../src/index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");
    // Ensure no custom session validation route exists
    expect(content).not.toContain("/api/session/validate");
  });

  // Security regression: no manual cookie parsing in index.ts
  it("should NOT parse cookies manually in auth/src/index.ts", () => {
    const indexPath = path.resolve(__dirname, "../src/index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");
    // Ensure no manual cookie header parsing
    expect(content).not.toContain('req.header("Cookie")');
    expect(content).not.toContain("parseCookie");
  });

  // Security regression: CSRF and origin check flags should NOT be disabled
  it("should NOT have disableCSRFCheck or disableOriginCheck in auth/src/lib/auth.ts", () => {
    const authPath = path.resolve(__dirname, "../src/lib/auth.ts");
    const content = fs.readFileSync(authPath, "utf-8");
    // Ensure CSRF and origin protection is NOT disabled
    expect(content).not.toContain("disableCSRFCheck");
    expect(content).not.toContain("disableOriginCheck");
  });
});
