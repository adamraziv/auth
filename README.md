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
