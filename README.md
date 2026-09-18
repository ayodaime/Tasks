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

### Option B — Render (managed, still simple)

Render's app checkout is rebuilt from scratch on every deploy, so both the SQLite
database file and uploaded attachments need to live on a **persistent disk** instead of
inside the repo checkout. This repo is already set up for that via `UPLOAD_DIR`, and
`npm run build` applies pending database migrations automatically (`prisma migrate
deploy`), so no separate console/shell step is needed.

1. Push this branch/PR to `main` (or point Render at this branch directly).
2. On [render.com](https://render.com), **New → Web Service**, connect the
   `ayodaime/Tasks` GitHub repo.
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
3. Under the service's **Disks** tab, add a disk — e.g. mount path `/var/data`, 1GB is
   plenty to start.
4. Under **Environment**, add:
   - `DATABASE_URL` = `file:/var/data/prod.db`
   - `UPLOAD_DIR` = `/var/data/uploads`
   - `NEXTAUTH_SECRET` = output of `openssl rand -base64 32`
   - `NEXTAUTH_URL` = the `.onrender.com` URL Render assigns you (or your custom domain,
     once attached)
   - `ALLOWED_EMAIL_DOMAINS` = your company's email domain, e.g. `acme.com`
5. Deploy. Once it's live, open the URL, click **Register**, and create the first
   account — it becomes admin.
6. Optional: attach a custom domain (e.g. `tasks.acme.com`) under **Settings → Custom
   Domains**, and update `NEXTAUTH_URL` to match.

Railway works the same way — a web service from this repo, a persistent volume, and the
same env vars, just adjust the volume's mount path.

### If you deploy to Vercel instead

Vercel's filesystem is wiped on every deploy/serverless invocation, so SQLite won't
persist there even with `UPLOAD_DIR` pointed at it. If you want Vercel specifically:

1. Switch `prisma/schema.prisma`'s datasource `provider` from `"sqlite"` to `"postgresql"`
   and point `DATABASE_URL` at a hosted Postgres (e.g. Neon or Supabase's free tier).
2. Re-run `npx prisma migrate dev` locally against that database once to generate a
   Postgres-compatible migration, then commit it.
3. Swap the local file storage in `src/app/api/tasks/[id]/attachments/route.ts` and
   `src/app/api/uploads/[taskId]/[filename]/route.ts` for an object store (e.g. S3 or
   Vercel Blob), since local disk writes won't persist there either.

## Managing roles and departments

Roles are `OFFICER`, `SUPERVISOR`, `MANAGER`, `ADMIN` — see "Roles" below for who can do
what. Departments are Admin, Customer Service, Digital Marketing, SEO, PR, and HR —
everyone picks theirs (and their role) when registering. Any admin can change either
from the app itself: sign in and click **Manage Staff** in the sidebar (only visible to
admins) to see staff grouped by department, with a role and department dropdown per
person. An admin can't change their own role there (to avoid accidentally locking
themselves out), though they can change their own department.

Accounts created before this field existed show up under "Not yet assigned" until an
admin gives them a department.

### Department-scoped task access

Every task belongs to a department (set by an admin when creating it, or automatically
to the creator's own department for everyone else). Staff and managers only ever see
tasks in their own department, full stop — this applies everywhere: the dashboard, the
task board and list, and direct links, including file attachments and comments. There's
no exception for being personally the assignee or manager in charge of a task outside
your department; that visibility is admin-only. Because of this, a manager can only
assign a task (or name a manager in charge) to someone in their own department in the
first place — only admins can place a task with someone outside it. Admins are
unrestricted and see every department; they also get a Department filter on the task
board and a Department field when creating a task or editing an existing one. A task
with no department yet ("Unclassified") is only visible to admins until one sets its
department.

### Roles

Four roles, in ascending order of privilege: `OFFICER`, `SUPERVISOR`, `MANAGER`,
`ADMIN`. Everyone picks Manager, Supervisor, or Officer when they register — `ADMIN` is
never self-selectable, it's only granted automatically to the very first account created,
or later by an existing admin via Manage Staff.

Only `SUPERVISOR`, `MANAGER`, and `ADMIN` accounts can create tasks or assign them (the
"New Task" button and the Assignee field's dropdown are hidden from `OFFICER` entirely,
and the API rejects both if attempted directly). Officers can still update the
status/priority of a task they're on, post progress comments, and upload attachments —
they just don't create or hand out new tasks. A supervisor or manager can only assign a
task — or name a manager in charge — to someone on their own team (department); admins
can assign across any department.

Note this is a self-service choice at registration: anyone who can register (subject to
`ALLOWED_EMAIL_DOMAINS`) can pick Supervisor or Manager for themselves and immediately
get task-creation/assignment rights, with no admin approval step. If you'd rather gate
that behind admin approval instead, an admin can always demote someone's role afterward
in Manage Staff — worth knowing if that self-service model doesn't fit how your company
wants to run this.

### Hiding an account from staff pickers

Any account can be marked "Hidden" in Manage Staff (a checkbox per person, editable by
an admin for anyone, including their own account). A hidden account is left out of
every non-admin's assignee/manager dropdowns and staff lists — admins still see it
everywhere, hidden or not. This is separate from department-scoped task access above:
hiding an account doesn't change who can see which tasks, it just keeps that person out
of pickers other staff use day to day (useful for an owner/admin account that shouldn't
be handed tasks like a regular team member).

```
prisma/schema.prisma        Database schema (User, Task, Comment, Attachment)
src/app/                    Pages (dashboard, tasks, login/register) and API routes
src/lib/auth.ts             NextAuth configuration
src/lib/constants.ts        Status/priority/role enums and labels
src/lib/uploads.ts          Resolves where attachments are stored (UPLOAD_DIR env var)
public/uploads/             Default attachment storage for local dev
```
