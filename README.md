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
