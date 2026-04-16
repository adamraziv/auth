import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { app } from "../../src/app.js";
import { CookieJar } from "../helpers/cookie-jar.js";
import { installEmailLinkCapture } from "../helpers/email-link-capture.js";
import { closeTestDatabase, resetTestDatabase } from "../helpers/test-db.js";

const origin = "http://localhost:3001";
const baseUrl = "http://localhost:3000";

type EmailCapture = ReturnType<typeof installEmailLinkCapture>;

let emailCapture: EmailCapture | null = null;

beforeEach(async () => {
  await resetTestDatabase();
  emailCapture = installEmailLinkCapture();
});

afterEach(() => {
  emailCapture?.restore();
  emailCapture = null;
});

afterAll(async () => {
  await closeTestDatabase();
});

describe("password reset flow", () => {
  it("resets password from captured email link and signs in with the new password", async () => {
    const email = `reset-${Date.now()}@example.com`;
    const oldPassword = "password123";
    const newPassword = "password456";

    // Step 1: Sign up and verify email
    const signup = await signUp({ email, password: oldPassword, name: "Reset User" });
    expect([200, 201]).toContain(signup.status);

    const verificationUrl = getEmailCapture().getVerificationUrl();
    const verification = await app.fetch(new Request(verificationUrl, { headers: { Origin: origin } }));
    expect([200, 302, 303]).toContain(verification.status);

    // Step 2: Sign in with old password - should work
    const signinBeforeReset = await signIn(email, oldPassword);
    expect(signinBeforeReset.status).toBe(200);

    // Step 3: Request password reset
    const resetRequest = await postJson("/api/auth/forget-password", { email });
    // Some versions use /api/auth/request-password-reset
    let resetStatus = resetRequest.status;
    if (resetStatus === 404) {
      const altResetRequest = await postJson("/api/auth/request-password-reset", { email });
      resetStatus = altResetRequest.status;
    }
    expect([200, 201]).toContain(resetStatus);

    // Step 4: Capture and follow the reset URL
    const passwordResetUrl = getEmailCapture().getPasswordResetUrl();
    expect(passwordResetUrl).toContain("reset-password");

    // The reset URL contains the token - we need to follow it to set new password
    const resetResponse = await app.fetch(new Request(passwordResetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin
      },
      body: JSON.stringify({ password: newPassword })
    }));

    // Accept redirect or success response
    expect([200, 201, 302, 303]).toContain(resetResponse.status);

    // Step 5: Old password should NOT work anymore
    const signinWithOldPassword = await signIn(email, oldPassword);
    expect(signinWithOldPassword.status).not.toBe(200);

    // Step 6: New password SHOULD work
    const signinWithNewPassword = await signIn(email, newPassword);
    expect(signinWithNewPassword.status).toBe(200);

    // Verify session is created with new password
    const jar = new CookieJar();
    jar.store(signinWithNewPassword);
    expect(jar.header()).not.toBe("");

    const sessionCheck = await getSession(jar);
    const sessionBody = await sessionCheck.json() as { user?: { email?: string } };
    expect(sessionCheck.status).toBe(200);
    expect(sessionBody.user?.email).toBe(email);
  });

  it("rejects password reset with invalid or expired token", async () => {
    const email = `invalid-reset-${Date.now()}@example.com`;
    const password = "password123";

    // Sign up first
    const signup = await signUp({ email, password, name: "Invalid Reset" });
    expect([200, 201]).toContain(signup.status);

    const verificationUrl = getEmailCapture().getVerificationUrl();
    const verification = await app.fetch(new Request(verificationUrl, { headers: { Origin: origin } }));
    expect([200, 302, 303]).toContain(verification.status);

    // Try to reset with a fake token URL
    const fakeResetUrl = `${baseUrl}/api/auth/reset-password/confirm?token=fake-expired-token`;
    const invalidReset = await app.fetch(new Request(fakeResetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin
      },
      body: JSON.stringify({ password: "newpassword" })
    }));

    // Should fail - either 400, 401, 403, or 404
    expect([400, 401, 403, 404]).toContain(invalidReset.status);
  });
});

function getEmailCapture() {
  if (!emailCapture) {
    throw new Error("Email link capture is not installed.");
  }

  return emailCapture;
}

function signUp(input: { email: string; password: string; name: string }) {
  return postJson("/api/auth/sign-up", input);
}

function signIn(email: string, password: string) {
  return postJson("/api/auth/sign-in", { email, password });
}

function postJson(path: string, body: unknown) {
  return app.fetch(new Request(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin
    },
    body: JSON.stringify(body)
  }));
}

function getSession(jar: CookieJar) {
  return app.fetch(new Request(`${baseUrl}/api/auth/get-session`, {
    method: "GET",
    headers: jar.headers({ Origin: origin })
  }));
}