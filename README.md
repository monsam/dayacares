# Daya Cares

Elderly care operations for Durgapur: home visits, vitals, family updates, scheduling, billing, and SOS.

The repo is an npm workspace with a React Native / Expo app, a shared TypeScript package, and an Express + MySQL API.

## Layout

| Path | What it is |
| --- | --- |
| `apps/mobile` | Expo app (web, iOS, Android). Login, worker visits, family home, admin ops. |
| `packages/shared` | Shared types and vitals helpers. |
| `services/vitals-api` | Express API on port `3333`. Talks to MySQL. |
| `services/vitals-api/sql` | Schema, seed data, and incremental migrations. |
| `forms` | Paper forms served as blanks or generated as prefilled PDFs. |
| `doc` | Design and architecture documents. |

## Roles

- **Admin** — members, users, worker routing, scheduling, reports, billing, emergencies
- **Worker** — today's schedule, guided visit form, visit history
- **Family** — linked Care Recipient status
- **Customer** — Care Recipient profile

## Prerequisites

- Node.js 20+
- MySQL 8 (Docker or a local install such as Homebrew)
- npm 10+

## Quick start

```bash
git clone https://github.com/monsam/dayacares.git
cd dayacares
cp .env.example .env
npm install
```

### 1. MySQL

**Docker** (applies schema, seed, scheduling, and billing/SOS on first start):

```bash
npm run db:up
```

**Homebrew / existing MySQL** — create the `daya` user if needed, then:

```bash
mysql -udaya -pdaya < services/vitals-api/sql/01-schema.sql
mysql -udaya -pdaya dayacares < services/vitals-api/sql/02-seed.sql
mysql -udaya -pdaya dayacares < services/vitals-api/sql/04-scheduling.sql
mysql -udaya -pdaya dayacares < services/vitals-api/sql/05-billing-sos.sql
```

`03-registration.sql` and `06-auth.sql` are for older databases only. A fresh `01-schema.sql` already includes those columns. The API also adds `users.password_hash` at startup if it is missing.

Default connection (see `.env.example`):

- host `127.0.0.1`, port `3306`
- user / password `daya` / `daya`
- database `dayacares`

### 2. API

```bash
npm run api:dev
```

Listens on `http://127.0.0.1:3333`. On start it backfills the default password hash for any user that does not have one.

### 3. App

```bash
npm run web -w @daya/mobile
```

Open `http://localhost:8081`. Point the app at the API with `EXPO_PUBLIC_API_URL` in `.env` (default `http://localhost:3333`).

## Sign in

Local / demo password for seeded and newly created users is `Daya@2026`, unless an admin set a different one.

Seeded usernames:

| Username | Role |
| --- | --- |
| `admin` | Admin |
| `caregiver` | Worker (Priya Sen) |
| `rahul` | Worker |
| `family` | Family (Arjun Banerjee) |
| `customer` | Care Recipient (Anjali Banerjee) |
| `ramesh`, `meera` | Care Recipients |

Change `DEFAULT_LOGIN_PASSWORD` in `.env` before the first API start if you do not want the default. Existing hashes are not overwritten.

Auth is username + password against MySQL (`POST /auth/login`). The session token is `Bearer demo:{username}`.

## Reports and paper forms

Admin **Reports** (`/visits`) loads visit history after you pick a Care Recipient. From there you can download:

- Registration
- Home assessment
- Schedule home visit
- Shift log

Blanks come from `forms/`. Prefills are generated from MySQL (the scans have no fillable PDF fields).

## Useful scripts

```bash
npm run db:up          # start MySQL in Docker
npm run db:down        # stop Docker MySQL
npm run api:dev        # API with reload
npm run typecheck      # all workspaces
npm run test           # shared package tests
```

## Local config

Copy `.env.example` to `.env`. Do not commit `.env`. SNS topic ARNs are optional until push notifications and WhatsApp alerts are wired.

## License

Private project for Daya Cares. All rights reserved.
