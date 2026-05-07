# Setup

## Prerequisites
- Node.js 20+
- Docker (for local Postgres)
- Anthropic API key
- Clerk account (free tier)

## 1. Install dependencies

```bash
npm install
```

## 2. Start local Postgres

```bash
docker run --name compliance-os-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=compliance_os \
  -p 5432:5432 \
  -d postgres:16
```

To stop / start later:
```bash
docker stop compliance-os-pg
docker start compliance-os-pg
```

## 3. Set up Clerk

1. Sign up at [clerk.com](https://clerk.com) and create a new application
2. From the dashboard, copy your **Publishable Key** and **Secret Key**
3. Open `.env.local` and replace the `REPLACE_ME` placeholders:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
4. Also fill in `ANTHROPIC_API_KEY`

## 4. Run database migration

```bash
npx prisma migrate dev --name init
```

This creates all tables (User, Applicant, Document, Job, AgentEvent, CrossDocCheck, Incident, ApiKey).

## 5. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## What works in Phase 1

- `/` — public landing with the original upload demo (in-memory, unchanged)
- `/sign-up` and `/sign-in` — Clerk auth pages, dark themed
- `/app/dashboard` — protected; redirects to sign-in if unauthed; shows empty dashboard once signed in
- After your first sign-in, a `User` row is auto-created in your local DB

## What does NOT work yet (coming in later phases)

- Creating applicants
- Uploading docs to applicants (the demo upload still works, but isn't tied to applicants)
- Cross-document reasoning (Agent 03)
- API layer
- Persistence of upload jobs (still in-memory)

## Switching to Neon (production)

When ready to deploy:

1. Create a Neon project at [neon.tech](https://neon.tech)
2. Copy the **pooled** connection string → `DATABASE_URL`
3. Copy the **direct** (non-pooled) string → `DIRECT_URL`
4. In `prisma/schema.prisma`, uncomment the `directUrl` line in the datasource block
5. Run `npx prisma migrate deploy`

## Troubleshooting

**`Error: P1001: Can't reach database server`**
→ Postgres isn't running. `docker start compliance-os-pg`.

**`Clerk: Missing publishable key`**
→ Forgot to fill in `.env.local`. Restart `npm run dev` after updating.

**`Module not found: Can't resolve '@prisma/client'`**
→ Run `npx prisma generate` to regenerate the client after schema changes.
