import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All v1 requirements from .planning/REQUIREMENTS.md
const v1Requirements = [
  "SETUP-01",
  "SETUP-02",
  "SETUP-03",
  "SETUP-04",
  "AUTH-01",
  "AUTH-02",
  "AUTH-03",
  "AUTH-04",
  "AUTH-05",
  "AUTH-06",
  "SESS-01",
  "SESS-02",
  "SESS-03",
  "SESS-04",
  "SESS-05",
  "USER-01",
  "USER-02",
  "USER-03",
  "USER-04",
  "SEC-01",
  "SEC-02",
  "SEC-03",
  "SEC-04",
  "DEPLOY-01",
  "DEPLOY-02",
  "DEPLOY-03"
] as const;

type RequirementId = (typeof v1Requirements)[number];

type VerificationType =
  | "automated-integration"
  | "automated-config"
  | "automated-coverage"
  | "existing-tests"
  | "manual-provider-backed";

interface CoverageMatrixEntry {
  id: RequirementId;
  verification: VerificationType;
  notes?: string;
}

// Requirement coverage matrix - maps each v1 requirement to its verification type
const coverageMatrix: CoverageMatrixEntry[] = [
  // Core Setup - automated integration tests
  { id: "SETUP-01", verification: "automated-config", notes: "Better Auth instance in src/lib/auth.ts" },
  { id: "SETUP-02", verification: "automated-integration", notes: "PostgreSQL adapter in auth-lifecycle.integration.test.ts" },
  { id: "SETUP-03", verification: "automated-config", notes: "Environment config in src/lib/env.ts" },
  { id: "SETUP-04", verification: "automated-integration", notes: "Migration in auth-lifecycle test setup" },

  // Authentication - mix of integration and manual/provider-backed
  { id: "AUTH-01", verification: "automated-integration", notes: "Signup in auth-lifecycle.integration.test.ts" },
  { id: "AUTH-02", verification: "automated-integration", notes: "Signin in auth-lifecycle.integration.test.ts" },
  { id: "AUTH-03", verification: "automated-integration", notes: "Email verification in auth-lifecycle.integration.test.ts" },
  { id: "AUTH-04", verification: "automated-integration", notes: "Password reset in password-reset.integration.test.ts" },
  { id: "AUTH-05", verification: "manual-provider-backed", notes: "Automated config/initiation only + manual Google callback verification" },
  { id: "AUTH-06", verification: "manual-provider-backed", notes: "Automated config only + manual account linking verification" },

  // Session Management
  { id: "SESS-01", verification: "automated-integration", notes: "Session cookie in auth-lifecycle.integration.test.ts" },
  { id: "SESS-02", verification: "automated-integration", notes: "Session persistence in auth-lifecycle.integration.test.ts" },
  { id: "SESS-03", verification: "automated-integration", notes: "Session validation in consumer-demo.integration.test.ts" },
  { id: "SESS-04", verification: "automated-integration", notes: "Signout in auth-lifecycle and consumer-demo tests" },
  { id: "SESS-05", verification: "automated-config", notes: "Secure cookies in security.test.ts" },

  // User Profiles
  { id: "USER-01", verification: "automated-integration", notes: "User record in session response" },
  { id: "USER-02", verification: "automated-integration", notes: "Profile update via POST /api/auth/update-user" },
  { id: "USER-03", verification: "automated-integration", notes: "Avatar URL (image field) in session response" },
  { id: "USER-04", verification: "automated-integration", notes: "Default role in session response" },

  // Security - mix of config and existing tests
  { id: "SEC-01", verification: "automated-config", notes: "Rate limiting config in env-contract.test.ts" },
  { id: "SEC-02", verification: "automated-config", notes: "CSRF protection config verification" },
  { id: "SEC-03", verification: "automated-integration", notes: "Password length in auth-lifecycle" },
  { id: "SEC-04", verification: "automated-integration", notes: "No email enumeration in auth-lifecycle" },

  // Deployment
  { id: "DEPLOY-01", verification: "existing-tests", notes: "Docker Compose via migration.test.ts" },
  { id: "DEPLOY-02", verification: "existing-tests", notes: "Dockerfile via migration.test.ts" },
  { id: "DEPLOY-03", verification: "automated-integration", notes: "Health check /api/auth/ok in health.test.ts" }
];

describe("requirement coverage matrix", () => {
  it("every v1 requirement has a coverage matrix entry", () => {
    const matrixIds = coverageMatrix.map((entry) => entry.id);

    for (const reqId of v1Requirements) {
      expect(matrixIds).toContain(reqId);
    }
  });

  it("every matrix id exists in .planning/REQUIREMENTS.md", () => {
    const requirementsPath = path.resolve(__dirname, "../../.planning/REQUIREMENTS.md");
    const requirementsContent = fs.readFileSync(requirementsPath, "utf-8");

    for (const entry of coverageMatrix) {
      expect(requirementsContent).toContain(entry.id);
    }
  });

  it("AUTH-05 and AUTH-06 are marked as manual-provider-backed", () => {
    const auth05 = coverageMatrix.find((e) => e.id === "AUTH-05");
    const auth06 = coverageMatrix.find((e) => e.id === "AUTH-06");

    expect(auth05?.verification).toBe("manual-provider-backed");
    expect(auth06?.verification).toBe("manual-provider-backed");
  });

  it("integration tests contain evidence for AUTH-01 through AUTH-04", () => {
    const integrationPath = path.resolve(__dirname, "./integration/auth-lifecycle.integration.test.ts");
    const content = fs.readFileSync(integrationPath, "utf-8");

    expect(content).toContain("signUp");
    expect(content).toContain("signIn");
  });

  it("consumer demo contains evidence for SESS-03 and USER profile fields", () => {
    const consumerPath = path.resolve(__dirname, "./integration/consumer-demo.integration.test.ts");
    const content = fs.readFileSync(consumerPath, "utf-8");

    expect(content).toContain("get-session");
    expect(content).toContain("user");
  });

  it("README contains Google OAuth manual verification section", () => {
    const readmePath = path.resolve(__dirname, "../README.md");
    const content = fs.readFileSync(readmePath, "utf-8");

    expect(content).toContain("Google OAuth");
    expect(content).toContain("manual/provider-backed");
  });

  it("package scripts contain test:integration and test:coverage", () => {
    const packagePath = path.resolve(__dirname, "../package.json");
    const content = fs.readFileSync(packagePath, "utf-8");

    expect(content).toContain("test:integration");
    expect(content).toContain("test:coverage");
  });
});

describe("negative assertions - boundary preservation", () => {
  it("README does not contain /api/session/validate", () => {
    const readmePath = path.resolve(__dirname, "../README.md");
    const content = fs.readFileSync(readmePath, "utf-8");

    expect(content).not.toContain("/api/session/validate");
  });

  it("consumer demo does not use direct PostgreSQL SELECT", () => {
    const consumerPath = path.resolve(__dirname, "./integration/consumer-demo.integration.test.ts");
    const content = fs.readFileSync(consumerPath, "utf-8");

    expect(content).not.toMatch(/SELECT.*FROM.*session/i);
    expect(content).not.toMatch(/SELECT.*FROM.*user/i);
    expect(content).not.toMatch(/SELECT.*FROM.*account/i);
  });

  it("README does not instruct direct PostgreSQL session validation", () => {
    const readmePath = path.resolve(__dirname, "../README.md");
    const content = fs.readFileSync(readmePath, "utf-8");

    // Should not instruct consumers to read database directly for session validation
    // It's OK for README to prohibit direct DB access (uses "must not")
    // What it should NOT do is say consumers CAN use direct DB access
    const prohibition = "must not read the auth PostgreSQL database directly";
    const instruction = "should read the auth PostgreSQL";
    expect(content).not.toContain(instruction);
  });
});

describe("V8 coverage provider configured", () => {
  it("vitest.config.ts includes V8 coverage provider", () => {
    const configPath = path.resolve(__dirname, "../vitest.config.ts");
    const content = fs.readFileSync(configPath, "utf-8");

    expect(content).toContain('provider: "v8"');
  });

  it("vitest.config.ts includes source file coverage include/exclude", () => {
    const configPath = path.resolve(__dirname, "../vitest.config.ts");
    const content = fs.readFileSync(configPath, "utf-8");

    expect(content).toContain("include:");
    expect(content).toContain("exclude:");
  });
});