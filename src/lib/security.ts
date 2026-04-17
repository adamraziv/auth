import { env } from "./env.js";

export const trustedOrigins = env.TRUSTED_ORIGINS;

export const corsOrigins = env.CORS_ORIGIN
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const rateLimit = {
  enabled: true,
  storage: "database",
  window: 10,
  max: 100,
  customRules: {
    "/sign-in/email": { window: 60, max: 10 },
    "/sign-up/email": { window: 60, max: 5 },
    "/forget-password": { window: 60, max: 3 },
    "/request-password-reset": { window: 60, max: 3 },
    "/reset-password": { window: 60, max: 3 },
    "/send-verification-email": { window: 60, max: 3 },
    "/get-session": { window: 60, max: 120 },
    "/update-user": { window: 60, max: 30 },
    "/sign-out": { window: 60, max: 30 }
  }
} as const;

export const ipAddressHeaders = ["x-forwarded-for", "x-real-ip"] as const;

export const publicAuthErrors = {
  authenticationFailed: {
    code: "AUTHENTICATION_FAILED",
    error: "Authentication failed"
  },
  invalidResetLink: {
    code: "INVALID_RESET_LINK",
    error: "Invalid or expired reset link"
  },
  rateLimited: {
    code: "RATE_LIMITED",
    error: "Too many requests"
  },
  internalError: {
    code: "INTERNAL_ERROR",
    error: "Internal server error"
  }
} as const;

export async function redactAuthErrorResponse(request: Request, response: Response): Promise<Response> {
  const pathname = new URL(request.url).pathname;

  // Redact OAuth and password-reset errors (4xx) and redirects (3xx) to JSON
  // But do not redact 404 - let non-existent routes pass through
  if (isOAuthErrorPath(pathname) && response.status >= 300 && response.status < 500 && response.status !== 404) {
    return redactedJson(response, publicAuthErrors.authenticationFailed, response.status >= 300 && response.status < 400 ? 400 : response.status);
  }

  if (isPasswordResetErrorPath(pathname) && response.status >= 300 && response.status < 500 && response.status !== 404) {
    return redactedJson(response, publicAuthErrors.invalidResetLink, response.status >= 300 && response.status < 400 ? 400 : response.status);
  }

  // Pass through non-error responses
  if (response.status < 400) {
    return response;
  }

  if (response.status === 429) {
    return redactedJson(response, publicAuthErrors.rateLimited, response.status);
  }

  if (response.status >= 500) {
    return redactedJson(response, publicAuthErrors.internalError, response.status);
  }

  return response;
}

function isOAuthErrorPath(pathname: string) {
  return pathname.includes("/callback/")
    || pathname.includes("/sign-in/social")
    || pathname.includes("/link-social");
}

function isPasswordResetErrorPath(pathname: string) {
  return pathname.includes("/reset-password")
    || pathname.includes("/forget-password")
    || pathname.includes("/request-password-reset");
}

function redactedJson(
  originalResponse: Response,
  body: (typeof publicAuthErrors)[keyof typeof publicAuthErrors],
  status: number
) {
  const headers = copyHeadersWithoutContentLength(originalResponse.headers);
  headers.set("content-type", "application/json");

  return Response.json(body, {
    status,
    headers
  });
}

function copyHeadersWithoutContentLength(source: Headers) {
  const headers = new Headers(source);
  headers.delete("content-length");
  headers.delete("location");
  return headers;
}
