# Security Posture

This document is the consumer contract for Bibot Auth security behavior. Consumers should build retries, cookie handling, trusted origins, and error handling around these values.

## Rate limits

Better Auth rate limiting is enabled with database-backed storage, not per-process memory storage. Clients should treat HTTP 429 as retryable throttling and should not retry password reset or verification email requests aggressively.

- Global auth limit: 100 requests per 10 seconds
- /sign-in/email: 10 requests per 60 seconds
- /sign-up/email: 5 requests per 60 seconds
- /forget-password: 3 requests per 60 seconds
- /reset-password: 3 requests per 60 seconds
- /send-verification-email: 3 requests per 60 seconds
- /get-session: 120 requests per 60 seconds
- /update-user: 30 requests per 60 seconds
- /sign-out: 30 requests per 60 seconds

## Cookie and session behavior

Production sets secure cookies when `NODE_ENV=production`. HTTPS is required in production because browser Secure cookies are not sent over plain HTTP. Local development can use HTTP only when it is not running production secure-cookie behavior.

Sessions use Better Auth database-backed session records plus a compact cookie cache with `maxAge: 300`. Downstream consumers validate sessions through `GET /api/auth/get-session` by forwarding the incoming `Cookie` header to the auth service.

## CORS, trusted origins, and CSRF

Browser consumers must send an `Origin` header matching `TRUSTED_ORIGINS`. Hono CORS is credentialed with explicit origins from `CORS_ORIGIN`, so browser fetch calls that need auth cookies must use `credentials: include`.

State-changing auth endpoints must not bypass Better Auth CSRF or origin checks. `disableCSRFCheck` and `disableOriginCheck` are not used.

## Error responses

Public auth error responses use these approved codes and messages:

- AUTHENTICATION_FAILED - Authentication failed
- INVALID_RESET_LINK - Invalid or expired reset link
- RATE_LIMITED - Too many requests
- INTERNAL_ERROR - Internal server error

OAuth provider details, password reset token state, database errors, SQL constraints, and stack traces are not returned to clients. Detailed diagnostics are server logs only.

## Consumer checklist

- Respect the documented rate limits and back off on HTTP 429.
- Forward the incoming `Cookie` header to `GET /api/auth/get-session`.
- Configure `TRUSTED_ORIGINS` and `CORS_ORIGIN` before browser integration.
- Use HTTPS in production.
- Handle 401, 403, and 429 generically without depending on internal Better Auth details.
- Consumers must not read the auth PostgreSQL database directly.
