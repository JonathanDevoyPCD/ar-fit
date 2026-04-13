# Backend Setup

This project now includes a custom Node.js backend for:
- email OTP register/login
- session cookies
- PostgreSQL planner storage

## 1. Install dependencies

```powershell
npm.cmd install
```

## 2. Create your environment file

Copy `.env.example` to `.env` and fill in:
- `DATABASE_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`

## 3. Create PostgreSQL database

Create a database named `arfit` or update `DATABASE_URL` to match your own database.

## 4. Run the schema

Run the SQL in:

```text
database/schema.sql
```

You can apply it with `psql`, DBeaver, pgAdmin, or any PostgreSQL client.

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

The backend uses SMTP via Nodemailer.

That means you need valid email delivery credentials before OTP login can work.

## 8. Recommended next infrastructure choices

- PostgreSQL hosting: local Postgres first, then managed hosting later
- Email provider: SMTP account or transactional email provider
- Backend hosting later: Render, Railway, Fly.io, or a VPS
