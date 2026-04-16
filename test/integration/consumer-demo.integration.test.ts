import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { app } from "../../src/app.js";
import { CookieJar } from "../helpers/cookie-jar.js";
import { createConsumerApp } from "../helpers/consumer-app.js";
import { installEmailLinkCapture } from "../helpers/email-link-capture.js";
import { closeTestDatabase, resetTestDatabase } from "../helpers/test-db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const origin = "http://localhost:3001";
const authBaseUrl = "http://localhost:3000";
const consumer = createConsumerApp({
  authBaseUrl,
  fetchAuth: (input, init) => app.fetch(new Request(input, init))
});

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

describe("consumer demo session validation", () => {
  it("validates signed-in user through separate consumer then rejects after signout", async () => {
    const email = `consumer-${Date.now()}@example.com`;
    const password = "password123";
    const jar = await signupVerifyAndSignin(email, password, "Consumer User");

    const firstConsumerSession = await getConsumerMe(jar);
    const firstConsumerBody = await firstConsumerSession.json() as ConsumerMeResponse;
    expect(firstConsumerSession.status).toBe(200);
    expect(firstConsumerBody.authenticated).toBe(true);
    expect(firstConsumerBody.user.id).toEqual(expect.any(String));
    expect(firstConsumerBody.user.id).not.toBe("");
    expect(firstConsumerBody.user.email).toBe(email);
    expect(firstConsumerBody.user.name).toBe("Consumer User");
    expect(firstConsumerBody.user.role).toBe("user");
    expect(firstConsumerBody.user).toHaveProperty("image");

    const update = await app.fetch(new Request(`${authBaseUrl}/api/auth/update-user`, {
      method: "POST",
      headers: jar.headers({
        "Content-Type": "application/json",
        Origin: origin
      }),
      body: JSON.stringify({
        name: "Consumer Updated",
        image: "https://example.com/consumer.png"
      })
    }));
    expect(update.status).toBe(200);
    jar.store(update);

    const updatedConsumerSession = await getConsumerMe(jar);
    const updatedConsumerBody = await updatedConsumerSession.json() as ConsumerMeResponse;
    expect(updatedConsumerSession.status).toBe(200);
    expect(updatedConsumerBody.authenticated).toBe(true);
    expect(updatedConsumerBody.user.name).toBe("Consumer Updated");
    expect(updatedConsumerBody.user.image).toBe("https://example.com/consumer.png");
    expect(updatedConsumerBody.user.role).toBe("user");

    const signout = await app.fetch(new Request(`${authBaseUrl}/api/auth/sign-out`, {
      method: "POST",
      headers: jar.headers({ Origin: origin })
    }));
    expect(signout.status).toBe(200);

    const revokedConsumerSession = await getConsumerMe(jar);
    expect(revokedConsumerSession.status).toBe(401);
    await expect(revokedConsumerSession.json()).resolves.toEqual({ authenticated: false });
  });

  it("consumer helper contains no direct auth internals or database access", () => {
    const helperPath = path.resolve(__dirname, "../helpers/consumer-app.ts");
    const content = fs.readFileSync(helperPath, "utf-8");

    expect(content).toContain("/api/auth/get-session");
    expect(content).not.toMatch(/src\/lib\/auth/);
    expect(content).not.toMatch(/src\/lib\/db/);
    expect(content).not.toMatch(/new Pool/);
    expect(content).not.toMatch(/SELECT/);
    expect(content).not.toMatch(/auth\.api/);
    expect(content).not.toMatch(/\/api\/session\/validate/);
  });
});

async function signupVerifyAndSignin(email: string, password: string, name: string) {
  const signup = await signUp({ email, password, name });
  expect([200, 201]).toContain(signup.status);

  const verificationUrl = getEmailCapture().getVerificationUrl();
  const verification = await app.fetch(new Request(verificationUrl, { headers: { Origin: origin } }));
  expect([200, 302, 303]).toContain(verification.status);

  const signin = await signIn(email, password);
  expect(signin.status).toBe(200);

  const jar = new CookieJar();
  jar.store(signin);
  expect(jar.header()).not.toBe("");

  return jar;
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

function postJson(route: string, body: unknown) {
  return app.fetch(new Request(`${authBaseUrl}${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin
    },
    body: JSON.stringify(body)
  }));
}

function getConsumerMe(jar: CookieJar) {
  return consumer.request("/consumer/me", {
    headers: jar.headers({ Origin: origin })
  });
}

function getEmailCapture() {
  if (!emailCapture) {
    throw new Error("Email link capture is not installed.");
  }

  return emailCapture;
}

type ConsumerMeResponse = {
  authenticated: true;
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    role: string;
  };
};
