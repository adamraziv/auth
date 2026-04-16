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

describe("email/password auth lifecycle", () => {
  it("completes signup verification signin session persistence and signout", async () => {
    const email = `phase6-${Date.now()}@example.com`;
    const password = "password123";

    const signup = await signUp({ email, password, name: "Phase Six User" });
    expect([200, 201]).toContain(signup.status);

    const signinBeforeVerification = await signIn(email, password);
    expect(signinBeforeVerification.status).not.toBe(200);

    const verificationUrl = getEmailCapture().getVerificationUrl();
    const verification = await app.fetch(new Request(verificationUrl, { headers: { Origin: origin } }));
    expect([200, 302, 303]).toContain(verification.status);

    const signin = await signIn(email, password);
    expect(signin.status).toBe(200);

    const jar = new CookieJar();
    jar.store(signin);
    expect(jar.header()).not.toBe("");

    const firstSession = await getSession(jar);
    const firstSessionBody = await firstSession.json() as { user?: { email?: string } };
    expect(firstSession.status).toBe(200);
    expect(firstSessionBody.user?.email).toBe(email);

    const secondSession = await getSession(jar);
    const secondSessionBody = await secondSession.json() as { user?: { email?: string } };
    expect(secondSession.status).toBe(200);
    expect(secondSessionBody.user?.email).toBe(email);

    const signout = await app.fetch(new Request(`${baseUrl}/api/auth/sign-out`, {
      method: "POST",
      headers: jar.headers({ Origin: origin })
    }));
    expect(signout.status).toBe(200);

    const revokedSession = await getSession(jar);
    if (revokedSession.status === 401) {
      expect(revokedSession.status).toBe(401);
    } else {
      expect(revokedSession.status).toBe(200);
      const revokedBody = await revokedSession.json() as { user?: unknown };
      expect(revokedBody.user).toBeFalsy();
    }
  });

  it("rejects weak passwords and avoids email enumeration status drift", async () => {
    const weakPasswordSignup = await signUp({
      email: `weak-${Date.now()}@example.com`,
      password: "short",
      name: "Weak Password"
    });
    expect(weakPasswordSignup.status).toBe(400);

    const email = `parity-${Date.now()}@example.com`;
    const password = "password123";

    const signup = await signUp({ email, password, name: "Parity User" });
    expect([200, 201]).toContain(signup.status);

    const verificationUrl = getEmailCapture().getVerificationUrl();
    const verification = await app.fetch(new Request(verificationUrl, { headers: { Origin: origin } }));
    expect([200, 302, 303]).toContain(verification.status);

    const existingEmailWrongPassword = await signIn(email, "wrongpassword");
    const unknownEmail = `unknown-${Date.now()}@example.com`;
    const unknownEmailWrongPassword = await signIn(unknownEmail, "wrongpassword");

    const unauthenticatedStatuses = [400, 401];
    const statusesMatch = existingEmailWrongPassword.status === unknownEmailWrongPassword.status;
    const classesMatch = unauthenticatedStatuses.includes(existingEmailWrongPassword.status)
      && unauthenticatedStatuses.includes(unknownEmailWrongPassword.status);

    expect(statusesMatch || classesMatch).toBe(true);

    await expectNoEnumerationLeak(existingEmailWrongPassword, email);
    await expectNoEnumerationLeak(unknownEmailWrongPassword, unknownEmail);
  });
});

function getEmailCapture() {
  if (!emailCapture) {
    throw new Error("Email link capture is not installed.");
  }

  return emailCapture;
}

async function signUp(input: { email: string; password: string; name: string }) {
  const emailRoute = await postJson("/api/auth/sign-up/email", input);

  if (emailRoute.status !== 404) {
    return emailRoute;
  }

  return postJson("/api/auth/sign-up", input);
}

function signIn(email: string, password: string) {
  return postJson("/api/auth/sign-in/email", { email, password });
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

async function expectNoEnumerationLeak(response: Response, submittedEmail: string) {
  const body = (await response.text()).toLowerCase();

  expect(body).not.toContain(submittedEmail.toLowerCase());
  expect(body).not.toMatch(/user exists|no user|not found/);
}
