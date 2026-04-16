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

## Downstream Session Validation

Downstream services validate sessions by calling GET /api/auth/get-session over HTTP and forwarding the incoming Cookie header and relevant request headers. Downstream services must not read the auth PostgreSQL database directly for session validation.

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

### Health Checks

The service exposes a health check endpoint:
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
