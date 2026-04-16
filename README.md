# Bibot Auth Service

## Prerequisites

- Node.js 22+
- npm
- PostgreSQL reachable from this service

## Install

```bash
npm install
```

## Environment

Copy `.env.example` to `.env` and set values for your environment.

Required variables include:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `PORT`
- `CORS_ORIGIN`
- `TRUSTED_ORIGINS`

## Run

```bash
npm run dev
npm run typecheck
npm run build
npm run test
npm run test:integration
npm run test:coverage
```

### Full Test Suite

Run all tests including integration and coverage:

```bash
npm test && npm run typecheck && npm run test:integration && npm run test:coverage
```

Or via proxy:
```bash
rtk proxy bash -lc 'cd auth && npm test && npm run typecheck && npm run test:integration && npm run test:coverage'
```

## Migrate Better Auth Schema

Before running migration, ensure PostgreSQL is running and `DATABASE_URL` points to that instance.

```bash
npm run auth:migrate
```

## Social Sign-In (Google OAuth)

### Setup

1. Create OAuth credentials in Google Cloud Console:
   - Go to APIs & Services > Credentials > Create Credentials > OAuth client ID
   - Application type: Web application
   - Add authorized redirect URI: `{BETTER_AUTH_URL}/api/auth/callback/google`

2. Set environment variables:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/auth/sign-in/social | POST | Initiates Google OAuth flow |
| /api/auth/callback/google | GET | Google OAuth callback |
| /api/auth/reset-password | POST | Request password reset email |
| /api/auth/reset-password/confirm | POST | Confirm new password |

> **Note:** Password reset emails are logged to console in development (matching email verification behavior).

### Manual/Provider-Backed OAuth Verification

Full Google OAuth login (AUTH-05) and same-email account linking (AUTH-06) require real Google credentials and are **manual/provider-backed** verification.

**Automated tests verify:**
- Google OAuth configuration in auth.ts (`socialProviders`, `clientId`, `clientSecret`)
- OAuth initiation endpoint responds (config/initiation only, not callback)

**Manual verification steps for AUTH-05 and AUTH-06:**

1. Configure real Google OAuth credentials:
   ```bash
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

2. Register redirect URI in Google Cloud Console OAuth client:
   - `{BETTER_AUTH_URL}/api/auth/callback/google`

3. Run automated config/initiation checks:
   ```bash
   rtk proxy bash -lc 'cd auth && npm run test:integration -- oauth'
   ```

4. Complete Google sign-in in a browser:
   - Visit consumer app sign-in page
   - Click "Sign in with Google"
   - Complete Google account selection

5. Verify session after OAuth callback:
   ```bash
   curl -v http://localhost:3000/api/auth/get-session \
     -H "Cookie: better-auth.session_info=your_session_cookie"
   ```
   - Should return user object with `email`, `name`, `image` fields

6. For AUTH-06 (account linking):
   - Sign up with email/password using a Google-associated email
   - Verify email
   - Complete Google sign-in with same email
   - Verify same user identity is reused (not duplicated)

**If no real Google credentials available:**
- AUTH-05 and AUTH-06 remain `manual-provider-backed`
- They are verified through the automated config/initiation tests above
- A future deterministic mock OIDC provider could automate this

## Downstream Session Validation

Downstream services validate sessions by calling GET /api/auth/get-session over HTTP and forwarding the incoming Cookie header and relevant request headers. Downstream services must not read the auth PostgreSQL database directly for session validation.

## Security Posture

Security posture, public rate limits, secure-cookie requirements, trusted-origin behavior, and approved public error responses are documented in [docs/SECURITY.md](docs/SECURITY.md).

### Endpoints

| Endpoint | Method | Consumer use |
|----------|--------|--------------|
| /api/auth/get-session | GET | Validate the forwarded browser session cookie/header and receive Better Auth `session` and `user` data |
| /api/auth/update-user | POST | Update the authenticated user's `name` and `image` profile fields |
| /api/auth/sign-out | POST | Revoke the current session and clear Better Auth session cookies |

### Session Response Behavior

A valid session response contains Better Auth session data and user data. A missing, expired, or revoked session must be treated as unauthenticated when Better Auth returns null session/user data or an unauthenticated status.

### User Profile Fields

The public user profile fields are id, email, name, image, and role. The image field is the avatar URL field. Role values are user and admin; new users default to user. Clients must not send role in signup or update-user payloads.

Use POST /api/auth/update-user with JSON fields name and image for profile updates. For freshness-sensitive server-side checks, call Better Auth server APIs with disableCookieCache: true rather than reading the database directly.

## Docker Deployment

The auth service can be run as a Docker container with PostgreSQL.

### Prerequisites

- Docker and Docker Compose installed
- Generated BETTER_AUTH_SECRET (32+ character random string)

### Quick Start

1. **Configure environment:**
   ```bash
   cp auth/.env.docker auth/.env
   # Edit auth/.env and set a secure BETTER_AUTH_SECRET
   # Generate one with: openssl rand -base64 32
   ```

2. **Start services:**
   ```bash
   docker compose up -d
   ```

3. **Run database migrations:**
   ```bash
   docker compose exec auth npm run auth:migrate
   ```

4. **Verify health:**
   ```bash
   curl http://localhost:3000/api/auth/ok
   ```

5. **View logs:**
   ```bash
   docker compose logs -f auth
   ```

### Stopping

```bash
docker compose down
```

To also remove the PostgreSQL volume (destroys all data):
```bash
docker compose down -v
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| BETTER_AUTH_SECRET | Yes | 32+ character random secret for session signing |
| DATABASE_URL | Yes | PostgreSQL connection string |
| CORS_ORIGIN | No | Frontend origin for CORS (default: http://localhost:3001) |
| TRUSTED_ORIGINS | No | Comma-separated trusted origins (default: http://localhost:3000) |
| GOOGLE_CLIENT_ID | No | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | No | Google OAuth client secret |

### API Reference (Scalar)

A human-readable API reference is available at:
```
GET /api/auth/reference
```

This serves the Better Auth OpenAPI specification via Scalar UI.

### Health Checks

The service also exposes a health check endpoint:
```
GET /api/auth/ok
```

Returns `200 OK` with JSON:
```json
{
  "status": "ok",
  "service": "bibot-auth",
  "timestamp": "2026-04-16T10:00:00.000Z"
}
```
