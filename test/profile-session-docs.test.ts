import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Downstream profile and session docs", () => {
  it("should document get-session endpoint", () => {
    const readmePath = path.resolve(__dirname, "../README.md");
    const content = fs.readFileSync(readmePath, "utf-8");

    expect(content).toContain("GET /api/auth/get-session");
    expect(content).toContain("forwarding the incoming Cookie header");
  });

  it("should prohibit direct database access", () => {
    const readmePath = path.resolve(__dirname, "../README.md");
    const content = fs.readFileSync(readmePath, "utf-8");

    expect(content).toContain("must not read the auth PostgreSQL database directly");
  });

  it("should document update-user endpoint with name and image fields", () => {
    const readmePath = path.resolve(__dirname, "../README.md");
    const content = fs.readFileSync(readmePath, "utf-8");

    expect(content).toContain("POST /api/auth/update-user");
    expect(content).toContain("name");
    expect(content).toContain("image");
  });

  it("should not contain avatarUrl (use image instead)", () => {
    const readmePath = path.resolve(__dirname, "../README.md");
    const content = fs.readFileSync(readmePath, "utf-8");

    expect(content).not.toContain("avatarUrl");
  });

  it("should document role values and prohibition", () => {
    const readmePath = path.resolve(__dirname, "../README.md");
    const content = fs.readFileSync(readmePath, "utf-8");

    expect(content).toContain("Role values are user and admin");
    expect(content).toContain("new users default to user");
    expect(content).toContain("Clients must not send role in signup or update-user payloads");
  });

  it("should not contain custom /api/session/validate endpoint", () => {
    const readmePath = path.resolve(__dirname, "../README.md");
    const content = fs.readFileSync(readmePath, "utf-8");

    expect(content).not.toContain("/api/session/validate");
  });

  it("should not contain SQL table queries for downstream", () => {
    const readmePath = path.resolve(__dirname, "../README.md");
    const content = fs.readFileSync(readmePath, "utf-8");

    expect(content).not.toMatch(/SELECT\s+.*(session|user|account)/i);
  });

  it("should document sign-out endpoint", () => {
    const readmePath = path.resolve(__dirname, "../README.md");
    const content = fs.readFileSync(readmePath, "utf-8");

    expect(content).toContain("/api/auth/sign-out");
    expect(content).toContain("POST");
  });
});