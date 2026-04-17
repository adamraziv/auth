import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("OAuth & Password Reset Configuration", () => {
  it("should include Google OAuth env vars in .env.example", () => {
    const envPath = path.resolve(__dirname, "../.env.example");
    const content = fs.readFileSync(envPath, "utf-8");

    expect(content).toContain("GOOGLE_CLIENT_ID=");
    expect(content).toContain("GOOGLE_CLIENT_SECRET=");
  });

  it("should include OAuth in auth.ts configuration", () => {
    const authPath = path.resolve(__dirname, "../src/lib/auth.ts");
    const content = fs.readFileSync(authPath, "utf-8");

    expect(content).toContain("socialProviders");
    expect(content).toContain("google");
    expect(content).toContain("clientId: env.GOOGLE_CLIENT_ID");
    expect(content).toContain("clientSecret: env.GOOGLE_CLIENT_SECRET");
  });

  it("should include password reset in auth.ts configuration", () => {
    const authPath = path.resolve(__dirname, "../src/lib/auth.ts");
    const content = fs.readFileSync(authPath, "utf-8");

    expect(content).toContain("sendResetPassword");
    expect(content).toContain("env.NODE_ENV !== \"production\"");
    expect(content).toContain("Password Reset Email queued for:");

    // Verify the token URL logging is guarded by production check
    const resetEmailIdx = content.indexOf("Password Reset Email:");
    const guardIdx = content.lastIndexOf("env.NODE_ENV !== \"production\"", resetEmailIdx);
    expect(guardIdx).toBeGreaterThanOrEqual(0);
    expect(resetEmailIdx).toBeGreaterThan(guardIdx);
  });

  it("should include verification email in auth.ts configuration with production guard", () => {
    const authPath = path.resolve(__dirname, "../src/lib/auth.ts");
    const content = fs.readFileSync(authPath, "utf-8");

    expect(content).toContain("sendVerificationEmail");
    expect(content).toContain("Verification Email queued for:");

    // Verify the token URL logging is guarded by production check
    const verifyEmailIdx = content.indexOf("Verification Email:");
    const guardIdx = content.lastIndexOf("env.NODE_ENV !== \"production\"", verifyEmailIdx);
    expect(guardIdx).toBeGreaterThanOrEqual(0);
    expect(verifyEmailIdx).toBeGreaterThan(guardIdx);
  });

  it("should include Google OAuth env vars in env.ts", () => {
    const envPath = path.resolve(__dirname, "../src/lib/env.ts");
    const content = fs.readFileSync(envPath, "utf-8");

    expect(content).toContain("GOOGLE_CLIENT_ID");
    expect(content).toContain("GOOGLE_CLIENT_SECRET");
  });

  it("should avoid broken Better Auth subpath imports", () => {
    const authPath = path.resolve(__dirname, "../src/lib/auth.ts");
    const content = fs.readFileSync(authPath, "utf-8");

    expect(content).not.toContain("better-auth/social-providers/google");
    expect(content).not.toContain("better-auth/plugins/password-reset");
  });
});
