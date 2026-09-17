# Company Tasks

A small internal web app for uploading tasks and tracking their progress.
Staff log in with their office email address.

**Stack:** Next.js (App Router, TypeScript) + Prisma + SQLite + NextAuth (email/password) + Tailwind CSS.
Everything runs as one self-contained app — no external services required to get started.

## Features

- Sign in / register with office email + password (NextAuth, passwords hashed with bcrypt)
- Dashboard: task counts by status, overall completion %, your open tasks, overdue tasks
- Task list with filters by status, priority, assignee, and manager
- Create/edit tasks: title, description, status, priority, due date, assignee, **manager in charge**
- File attachments per task (uploaded files, 10MB max)
- Progress-update comment thread per task
- First person to register becomes an admin automatically

## 1. Local setup

Requires Node.js 20+.

```bash
npm install
cp .env.example .env
```

Edit `.env`:

- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `ALLOWED_EMAIL_DOMAINS` — set to your company's email domain(s), e.g. `acme.com`, to stop
  people registering with a personal email address. Leave blank while testing locally.

Create the database and start the app:

```bash
npm run db:migrate
npm run dev
```

Open http://localhost:3000, click **Register**, and create an account — it becomes the
first admin. Everyone after that registers as regular staff; promote people to
`MANAGER`/`ADMIN` directly in the database for now (see "Managing roles" below), or run
the seed script to create a dedicated admin account:

```bash
SEED_ADMIN_EMAIL=admin@acme.com SEED_ADMIN_PASSWORD='ChangeMe123!' npm run db:seed
```

## 2. Deploying so your ~60 staff can use it

This app needs a Node.js server (not a static host) plus a persistent disk for the
SQLite database and uploaded files. Two easy options:

### Option A — a small VPS / your own server (recommended for this size)

1. Copy the repo to the server, `npm install`, `npm run build`.
2. Set the same env vars as above in `.env` (use a strong `NEXTAUTH_SECRET`, and set
   `NEXTAUTH_URL` to your real domain, e.g. `https://tasks.acme.com`).
3. `npm run db:migrate` once to create the database.
4. Run `npm start` behind a process manager (`pm2 start npm --name tasks -- start`) and
   put Nginx/Caddy in front for HTTPS.
5. Point your company's DNS (e.g. `tasks.acme.com`) at the server.

### Option B — Render / Railway (managed, still simple)

1. Create a new "Web Service" from this repo. Build command: `npm run build`. Start
   command: `npm start`.
2. Attach a **persistent disk** (both platforms offer this) mounted so `prisma/dev.db`
   and `public/uploads` survive restarts/deploys — without this the DB and file uploads
   are wiped every deploy.
3. Set the env vars from `.env.example` in the platform's dashboard.
4. Run `npm run db:migrate` once via the platform's shell/console after first deploy.

### If you deploy to Vercel instead

Vercel's filesystem is wiped on every deploy/serverless invocation, so SQLite and local
file uploads won't persist there. If you want Vercel specifically:

1. Switch `prisma/schema.prisma`'s datasource `provider` from `"sqlite"` to `"postgresql"`
   and point `DATABASE_URL` at a hosted Postgres (e.g. Neon or Supabase's free tier).
2. Re-run `npx prisma migrate dev` locally against that database once to generate a
   Postgres-compatible migration, then commit it.
3. Swap the local file upload storage in
   `src/app/api/tasks/[id]/attachments/route.ts` for an object store (e.g. S3 or
   Vercel Blob), since local disk writes won't persist there either.

## Managing roles

Roles are `STAFF`, `MANAGER`, `ADMIN` (the `manager` picker on a task only lists
`MANAGER`/`ADMIN` users). There's no admin UI for role changes yet — update directly via
Prisma Studio:

```bash
npx prisma studio
```

Open the `User` table and change a person's `role` field.

## Project structure

```
prisma/schema.prisma        Database schema (User, Task, Comment, Attachment)
src/app/                    Pages (dashboard, tasks, login/register) and API routes
src/lib/auth.ts             NextAuth configuration
src/lib/constants.ts        Status/priority/role enums and labels
public/uploads/             Uploaded task attachments (persist this directory in prod)
```
