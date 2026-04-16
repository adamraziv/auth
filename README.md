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
