# Backend Setup

This project now includes a custom Node.js backend for:
- email OTP register/login
- session cookies
- PostgreSQL planner storage
- virtual course management (organizer + public)

## 1. Install dependencies

```powershell
npm.cmd install
```

## 2. Create your environment file

Copy `.env.example` to `.env` and fill in:
- `DATABASE_URL`
- `EMAIL_FROM`
- optional `ORGANIZER_EMAILS` (comma-separated emails allowed to use `course-builder.html`)

Email provider options:
- SMTP mode (`EMAIL_PROVIDER=smtp`)
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_SECURE`
  - `SMTP_USER`
  - `SMTP_PASS`
- Resend mode (`EMAIL_PROVIDER=resend`)
  - `RESEND_API_KEY`
  - optional `RESEND_API_URL` (defaults to `https://api.resend.com/emails`)

## 3. Create PostgreSQL database

Create a database named `arfit` or update `DATABASE_URL` to match your own database.

## 4. Run the schema

Run the SQL in:

```text
database/schema.sql
```

You can apply it with `psql`, DBeaver, pgAdmin, or any PostgreSQL client.

If you already had an older database, run `database/schema.sql` again to apply new `courses` tables and the `profiles.is_organizer` column.

## 5. Start the backend

```powershell
npm.cmd run dev
```

Default API URL:

```text
http://localhost:3000/api
```

## 6. Frontend/API origin notes

Allowed frontend origins come from:

```text
FRONTEND_ORIGINS
```

For local development, keep values like:
- `http://127.0.0.1:3000`
- `http://localhost:3000`

For production GitHub Pages, include:
- `https://jonathandevoypcd.github.io`

## 7. OTP email notes

The backend supports:
- SMTP via Nodemailer (`EMAIL_PROVIDER=smtp`)
- Resend API (`EMAIL_PROVIDER=resend`)

You need valid delivery credentials before OTP login can work.

## 8. Recommended next infrastructure choices

- PostgreSQL hosting: local Postgres first, then managed hosting later
- Email provider: SMTP account or transactional email provider
- Backend hosting later: Render, Railway, Fly.io, or a VPS

## 9. Production deployment baseline

For production:
- set `NODE_ENV=production`
- set a hosted `DATABASE_URL`
- set `FRONTEND_ORIGINS` to your real frontend URL(s)
- set `DATABASE_SSL=true` if your hosted PostgreSQL requires SSL
- set `ORGANIZER_EMAILS` to the accounts that should create or edit courses
