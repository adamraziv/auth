import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("User profile and session contract", () => {
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
