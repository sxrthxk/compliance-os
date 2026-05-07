# ComplianceOS — Project Plan

Multi-agent KYC document verification system for Indian fintechs.

## Project framing

This is a **portfolio project**, not a business (yet). The goal is a polished, shippable product that:

1. Demonstrates real engineering depth (multi-agent AI, persistence, auth, API)
2. Solves a real-shaped problem in a real industry (Indian KYC + underwriting)
3. Can be opened on a recruiter's machine, tested with their own docs, and Just Works
4. Becomes the conversation-starter for later founder outreach

The headline feature — and the actual differentiator — is **multi-agent cross-document reasoning**: not "extract fields from a PDF" (Claude does that) but "verify that the salary on the slip matches the bank credits, that the name on the rent agreement matches the Aadhaar, that the PAN on Form 26AS matches the declared PAN." This is the part that's hard to replicate by pasting PDFs into ChatGPT, and it's the part that becomes the demo's punchline.

Business validation comes *after* shipping, not before. Once the product is polished, outreach to NBFC/fintech leaders begins — and feedback from those calls drives the v2 roadmap.

---

## Current state (as of writing)

**What works:**
- Next.js 15 app with App Router, TypeScript, Tailwind v4
- Upload PDF/image → Agent 01 (Claude vision) extracts fields → Agent 02 verifies → live SSE feed → results dashboard
- Doc type auto-detection from filename (bank statement, salary slip, Form 26AS, rent agreement, eMandate)
- In-memory job store
- Tested end-to-end on a real CC statement

**What's missing:**
- No persistence — every refresh wipes everything
- No applicants (a KYC subject is a *bundle* of docs, not one doc)
- No auth, no multi-user
- No cross-doc consistency checks (the actual differentiator for KYC)
- No API layer for fintech integration
- No payment infra

---

## Stack decisions

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Already in use |
| DB | Postgres (local for dev → Neon for prod) | India-safe, generous free tier, Prisma-compatible |
| ORM | Prisma | Type-safe, migrations, great DX |
| File storage | Vercel Blob | Co-located with app, simple SDK |
| Auth | Clerk (TBD — may swap for NextAuth) | Drop-in UI, free up to 10k MAU |
| Styling | Tailwind v4 | Already in use |
| Deploy | Vercel | Already targeted |
| Payments | x402 protocol | Agentic micropayments per agent run |

> **Note on Supabase:** Was considered for DB+auth+storage, but blocked in India for ~10 days in Feb–March 2026 under IT Act 69A. Restored, but the precedent is real. Going with Neon (pure Postgres on AWS) instead to remove that risk.

---

## Phased build plan

Each phase is independently shippable. Stop and demo at any point.

### Phase 1 — DB + Auth foundation

**Goal:** Logged-in user lands on an empty dashboard.

- [ ] Add Prisma + local Postgres (dev) / Neon connection (prod)
- [ ] Define schema: `User`, `Applicant`, `Document`, `Job`, `AgentEvent`, `CrossDocCheck` (see Schema section below)
- [ ] Run first migration
- [ ] Add Clerk → wire `<SignIn />`, `<SignUp />`, `middleware.ts`
- [ ] Mirror Clerk users into local `User` table on first sign-in (via webhook or lazy lookup)
- [ ] Protect `/dashboard` and all `/applicants/*` routes
- [ ] Build empty dashboard layout with sidebar

**Deliverable:** Sign in → see empty dashboard with "No applicants yet" empty state.

### Phase 2 — Applicant CRUD + dual entry points  ✅ DONE

**Goal:** Both manual creation and Quick Verify flows working. PAN auto-merge live. Incidents created on field mismatches.

- [x] `POST /api/applicants` — manual create
- [x] `GET /api/applicants` — list current user's applicants (excludes DRAFT)
- [x] `GET /api/applicants/[id]` — single applicant
- [x] `PATCH /api/applicants/[id]` — update fields, confirm draft
- [x] `DELETE /api/applicants/[id]` — delete
- [x] PAN dedup: on manual create, if PAN matches existing → silently route to that applicant
- [x] PAN dedup on PATCH (returns 409 with `pan_conflict` if user tries to set a PAN that conflicts)
- [x] `/app/applicants/new` — manual creation form
- [x] `/app/applicants` — list view
- [x] `/app/applicants/[id]` — detail view with editable confirmation banner for DRAFT applicants
- [x] Quick Verify entry point on dashboard — uploads doc, runs Agent 01, auto-creates DRAFT applicant
- [ ] **DEFERRED to Phase 5:** Auto-attach on PAN match during Quick Verify (needs Agent 03 cross-doc to do meaningfully)
- [ ] **DEFERRED to Phase 5:** Incident creation on field mismatch (needs Agent 03)
- [ ] **DEFERRED to Phase 6:** Background cleanup job for stale DRAFTs

### Phase 3 — Persistent upload flow  ✅ DONE

**Goal:** Migrate the working demo into the applicant flow.

- [x] Replace `lib/store.ts` with Prisma calls (deleted, replaced by direct `db` calls in `lib/pipeline.ts`)
- [x] Upload a doc *to a specific applicant* (`/api/applicants/[id]/documents`)
- [x] File storage abstraction (`lib/storage.ts`) — local disk in dev, swap to Vercel Blob in Phase 6
- [x] File-serving route at `/api/files/[...path]` with auth check
- [x] Agent events persisted to `AgentEvent` table
- [x] SSE route polls DB at 500ms (acceptable for demo scale; LISTEN/NOTIFY upgrade later)
- [x] `/app/applicants/[id]/docs/[docId]` — replaces old `/review/[jobId]`
- [x] After verification completes, doc shows up in applicant timeline with verdict pill
- [x] Public `/` is now a marketing page that auto-redirects authed users to `/app/dashboard`

### Phase 4 — Applicant timeline view (next)

**Goal:** The "money shot" — one screen showing the applicant's entire verification state.

- [ ] `ApplicantTimeline` component — vertical timeline of all docs uploaded
- [ ] Per-doc summary card: doc type, verdict badge, score, key fields
- [ ] Aggregate verdict at top: PASS / NEEDS_REVIEW / FAIL based on all docs
- [ ] "Add another document" CTA inline

**Deliverable:** The screen you'd put in a portfolio screenshot.

### Phase 5 — Agent 03: Cross-doc consistency

**Goal:** The actual differentiator — only possible with persistence.

- [ ] New agent: `lib/agents/agent03-cross-doc.ts`
- [ ] Triggered automatically when a new doc is added to an applicant with ≥1 existing doc
- [ ] Checks (depending on doc combos available):
  - Name match across all docs
  - PAN match (Form 26AS vs declared PAN)
  - Salary slip net pay vs bank statement avg salary credit (±10%)
  - Address match (Aadhaar / rent agreement / bank statement)
  - Employer match (salary slip vs Form 26AS deductors)
  - Date consistency (no doc claims to be from before applicant's PAN issue date, etc.)
- [ ] Persist as `CrossDocCheck` rows
- [ ] Surface in applicant timeline as its own "Cross-Document Verification" card

**Deliverable:** Adding a 2nd doc visibly triggers cross-doc analysis. Mismatches surface clearly.

### Phase 6 — Dashboard polish

**Goal:** Make it look like a real product.

- [ ] Stat tiles: total applicants, pending review, passed, failed
- [ ] Recent activity feed
- [ ] Search + filter on applicant list
- [ ] Empty states with personality
- [ ] Loading skeletons everywhere
- [ ] Error boundaries
- [ ] Settings page scaffold (for Phase 7)

**Deliverable:** Looks like a product, not a project.

### Phase 7 — Public API

**Goal:** Fintechs integrate via API, not UI.

- [ ] API key generation in Settings page
- [ ] `Bearer` token auth on `/api/v1/*` routes
- [ ] `POST /api/v1/applicants` — create applicant
- [ ] `POST /api/v1/applicants/:id/documents` — upload doc (multipart)
- [ ] `GET /api/v1/applicants/:id` — full state including all jobs + cross-doc checks
- [ ] `GET /api/v1/jobs/:id` — single job state
- [ ] Webhook config: POST to customer URL when job completes
- [ ] Rate limiting per API key
- [ ] Usage tracking (count requests per key)
- [ ] Auto-generated API docs (use `next-rest-framework` or just hand-roll a simple page)

**Deliverable:** A `curl` command that does the entire flow.

### Phase 8 — x402 agentic payments

**Goal:** The shareable, novel feature.

- [ ] Read x402 spec, pick a chain (Base recommended for low fees)
- [ ] Each agent run priced: Agent 01 = ₹2, Agent 02 = ₹3, Agent 03 = ₹5
- [ ] Customer wallet → operator wallet on each agent completion
- [ ] Settle on-chain (or via x402 facilitator) per run
- [ ] Ledger view in dashboard: every agent run with txn hash, amount, status
- [ ] API requests can include a payment payload, agent only runs if payment authorized

**Deliverable:** "Each verification is its own micropayment" — write a blog post, post to Twitter.

## Applicant model — design decisions

These are locked in before Phase 2 work begins.

### Two entry points, one data model (Option C — hybrid)

Both paths produce the same `Applicant` record. The difference is just the entry point.

**Path 1 — Manual creation (the operator flow):**
1. User clicks "New Applicant" from dashboard
2. Fills form: name, email, phone, PAN
3. Lands on applicant page (empty timeline)
4. Uploads docs from there

**Path 2 — Quick Verify (the demo magic flow):**
1. User clicks "Verify a document" from dashboard
2. Drops a doc — Agent 01 runs immediately
3. Applicant auto-created with status `DRAFT`, fields populated from extraction
4. User lands on applicant page with an **editable confirmation banner** at the top:
   > *"We extracted this identity from your document. Please verify before continuing."*
   > — Name, PAN, Phone, Email each editable inline
   > — [Confirm] / [Edit] actions
5. On Confirm → dedup check runs (see below) → status flips to `PENDING`

The applicant page is the canonical view either way.

### PAN-based deduplication

**Scoping:** PAN is unique per user, not globally.
```prisma
@@unique([userId, panNumber])
```

This is critical for the multi-tenant case (when we eventually add it): two different operators legitimately onboarding the same person should not collide. Bank A and Bank B both running KYC on the same person is a normal real-world scenario.

When we add `Org` later, the scope shifts from `userId` to `orgId` with the same logic.

**Rules:**
- PAN is optional on `Applicant` (operators may create applicants before they have the PAN)
- Dedup check only runs when PAN is present
- Check fires on both create AND update (operator can add PAN later)

### What happens on a PAN match

If a doc is uploaded via Quick Verify and Agent 01 extracts a PAN that already belongs to an existing applicant in this user's workspace: **the doc is automatically attached to that existing applicant.** No modal, no choice. There is no legitimate reason for an operator to create a duplicate applicant record with the same PAN in the same workspace.

The auto-merge happens silently when extracted data is consistent with the existing applicant. When it's *not* consistent, that becomes an **Incident** (see below).

### Incidents — first-class data quality / fraud signals

When a new doc is attached to an existing applicant but its extracted fields don't match the applicant on file, that's a meaningful signal — not something to dismiss with a modal. It gets recorded as an `Incident` and the applicant moves to `IN_REVIEW`.

Examples:
- New doc's extracted name doesn't match existing applicant name (with fuzzy match tolerance)
- DOB on doc doesn't match DOB on file
- Address mismatch across docs
- Salary on slip doesn't match avg salary credits in bank statement (±10%)
- Employer mismatch between salary slip and Form 26AS

Incidents become a real product feature, not a hidden warning. The dashboard surfaces "X applicants with open incidents" — which is a more honest and more compelling metric than "X pending reviews."

### Schema additions

```prisma
model Applicant {
  // ... existing fields
  status  ApplicantStatus @default(DRAFT)
  source  ApplicantSource @default(MANUAL)
  incidents Incident[]

  @@unique([userId, panNumber])
}

enum ApplicantStatus {
  DRAFT          // auto-created from doc extraction, not yet confirmed by operator
  PENDING        // confirmed, awaiting / undergoing verification
  IN_REVIEW      // some docs flagged, operator action needed
  APPROVED
  REJECTED
}

enum ApplicantSource {
  MANUAL          // user filled the form
  AUTO_EXTRACTED  // came from document extraction, awaiting confirmation
}
```

**Why `DRAFT` matters:**
- Draft applicants don't count in dashboard stats
- Cleanup job can delete drafts older than 24h that were never confirmed
- Cross-doc checks (Agent 03) only run on `PENDING` or later applicants
- Dedup check on Confirm prevents drafts from polluting the unique constraint prematurely

---



```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model User {
  id          String      @id @default(cuid())
  clerkId     String      @unique
  email       String      @unique
  createdAt   DateTime    @default(now())
  applicants  Applicant[]
  apiKeys     ApiKey[]
}

model Applicant {
  id           String           @id @default(cuid())
  userId       String
  user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  name         String
  email        String?
  phone        String?
  panNumber    String?
  status       ApplicantStatus  @default(DRAFT)
  source       ApplicantSource  @default(MANUAL)
  documents    Document[]
  crossDocChecks CrossDocCheck[]
  incidents    Incident[]
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  @@unique([userId, panNumber])
  @@index([userId])
}

enum ApplicantStatus {
  DRAFT          // auto-created from doc extraction, not yet confirmed
  PENDING        // confirmed, awaiting verification
  IN_REVIEW
  APPROVED
  REJECTED
}

enum ApplicantSource {
  MANUAL          // operator filled the form
  AUTO_EXTRACTED  // came from doc extraction, awaiting confirmation
}

model Document {
  id           String      @id @default(cuid())
  applicantId  String
  applicant    Applicant   @relation(fields: [applicantId], references: [id], onDelete: Cascade)
  fileName     String
  fileUrl      String
  fileType     String      // mime type
  docType      String      // bank_statement | salary_slip | form_26as | rent_agreement | emandate
  jobs         Job[]
  createdAt    DateTime    @default(now())

  @@index([applicantId])
}

model Job {
  id           String       @id @default(cuid())
  documentId   String
  document     Document     @relation(fields: [documentId], references: [id], onDelete: Cascade)
  status       JobStatus    @default(PENDING)
  extraction   Json?
  verification Json?
  error        String?
  events       AgentEvent[]
  createdAt    DateTime     @default(now())
  completedAt  DateTime?

  @@index([documentId])
}

enum JobStatus { PENDING PROCESSING DONE ERROR }

model AgentEvent {
  id        String   @id @default(cuid())
  jobId     String
  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  agent     String   // 'Agent 01' | 'Agent 02' | 'system'
  status    String   // 'running' | 'done' | 'error'
  message   String
  timestamp DateTime @default(now())

  @@index([jobId])
}

model CrossDocCheck {
  id          String     @id @default(cuid())
  applicantId String
  applicant   Applicant  @relation(fields: [applicantId], references: [id], onDelete: Cascade)
  checkType   String     // 'name_match' | 'pan_match' | 'salary_match' | etc.
  passed      Boolean
  details     Json
  runAt       DateTime   @default(now())

  @@index([applicantId])
}

model Incident {
  id           String        @id @default(cuid())
  applicantId  String
  applicant    Applicant     @relation(fields: [applicantId], references: [id], onDelete: Cascade)
  documentId   String?       // optional — which doc triggered it
  type         IncidentType
  severity     Severity      @default(MEDIUM)
  details      Json          // e.g. { expected: "Rahul Sharma", found: "Rahul S Sharma", source: "salary_slip" }
  resolved     Boolean       @default(false)
  resolvedAt   DateTime?
  resolution   String?       // operator's note when resolving
  createdAt    DateTime      @default(now())

  @@index([applicantId])
  @@index([resolved])
}

enum IncidentType {
  NAME_MISMATCH         // extracted name doesn't match applicant on file
  DOB_MISMATCH
  ADDRESS_MISMATCH
  PAN_MISMATCH          // doc's PAN doesn't match applicant's declared PAN
  SALARY_INCONSISTENCY  // bank statement avg salary ≠ slip net pay
  EMPLOYER_MISMATCH     // salary slip employer ≠ Form 26AS deductor
  EXPIRED_DOCUMENT
  DUPLICATE_DOCUMENT    // same doc uploaded twice
  OTHER
}

enum Severity { LOW MEDIUM HIGH CRITICAL }

model ApiKey {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  keyHash     String    @unique     // store hash, not plaintext
  keyPrefix   String                 // first 8 chars for display: "cos_abc1..."
  lastUsedAt  DateTime?
  createdAt   DateTime  @default(now())
  revokedAt   DateTime?

  @@index([userId])
}
```

---

## Environment variables

```bash
# .env.local

# Database — works for local Docker Postgres or Neon (just swap the URL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/compliance_os"
# When moving to Neon: replace with the Neon connection string + add DIRECT_URL for migrations
# DIRECT_URL="postgresql://..."

# Auth (Phase 1) — get from clerk.com after creating an app
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# AI
ANTHROPIC_API_KEY="..."

# Storage (Phase 3)
BLOB_READ_WRITE_TOKEN="..."            # Vercel Blob

# Payments (Phase 8)
X402_FACILITATOR_URL="..."
OPERATOR_WALLET_ADDRESS="..."
OPERATOR_WALLET_PRIVATE_KEY="..."
```

### Local Postgres via Docker

For development, run Postgres locally in Docker:

```bash
docker run --name compliance-os-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=compliance_os \
  -p 5432:5432 \
  -d postgres:16
```

The default `DATABASE_URL` above matches this setup out of the box.

To stop / start later:
```bash
docker stop compliance-os-pg
docker start compliance-os-pg
```

### Switching to Neon (later)

When ready to deploy or move off local:
1. Create a Neon project at neon.tech
2. Copy the pooled connection string → `DATABASE_URL`
3. Copy the direct (non-pooled) string → `DIRECT_URL` (Prisma migrations need this)
4. In `prisma/schema.prisma`, add `directUrl = env("DIRECT_URL")` to the datasource block
5. Run `npx prisma migrate deploy`

No code changes needed — connection-string-only swap.

---

## Folder structure (target — after Phase 7)

```
compliance-os/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── lib/
│   ├── db.ts                    # Prisma singleton
│   ├── blob.ts                  # File storage helpers
│   ├── auth.ts                  # Clerk helpers
│   ├── api-keys.ts              # API key hashing/verification
│   ├── pipeline.ts              # Updated: DB-backed
│   └── agents/
│       ├── agent01-ingestion.ts
│       ├── agent02-verification.ts
│       └── agent03-cross-doc.ts
├── app/
│   ├── (marketing)/page.tsx     # Public landing
│   ├── (app)/                   # Auth-protected
│   │   ├── layout.tsx           # Sidebar shell
│   │   ├── dashboard/page.tsx
│   │   ├── applicants/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx           # Timeline view
│   │   │       ├── upload/page.tsx
│   │   │       └── docs/[docId]/page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       └── api-keys/page.tsx
│   ├── sign-in/[[...sign-in]]/page.tsx
│   ├── sign-up/[[...sign-up]]/page.tsx
│   └── api/
│       ├── process/route.ts
│       ├── status/[jobId]/route.ts
│       ├── applicants/...
│       └── v1/                  # Public API
│           ├── applicants/...
│           ├── documents/...
│           └── jobs/...
├── components/
│   ├── (existing)
│   ├── AppSidebar.tsx
│   ├── ApplicantCard.tsx
│   ├── ApplicantTimeline.tsx
│   ├── ApplicantConfirmBanner.tsx   # editable banner for DRAFT applicants
│   ├── IncidentCard.tsx             # individual incident with resolve action
│   ├── IncidentInbox.tsx            # list of open incidents on an applicant
│   ├── CrossDocVerdict.tsx
│   └── StatCard.tsx
└── middleware.ts
```

---

## Open questions / decisions to revisit

- **Auth provider final call:** Clerk (faster, prettier) vs NextAuth (free forever, more control). Defer until Phase 1.
- **Real-time strategy for SSE with DB:** Postgres LISTEN/NOTIFY vs polling vs Pusher/Ably. Polling every 500ms is fine for demo scale; LISTEN/NOTIFY is the right answer at scale.
- **Multi-tenant later:** Currently single-tenant (one user = one workspace). When ready, add `Org` model and FK from `Applicant` → `Org`.
- **Doc type expansion:** Split `bank_statement` into `bank_statement_savings` and `cc_statement` once we have the savings statement working — they need different verification logic.
- **Synthetic doc generation:** Build a separate script to generate test docs (Agent 03 needs at least 2 consistent docs per applicant for cross-doc checks to be meaningful).

---

## Pending small changes (apply before Phase 1)

These were noted during demo testing and should land before any phase work begins:

1. ✅ Highlight document type when "Extraction complete" event fires in the live feed
2. ✅ Migrate `globals.css` to Tailwind v4 syntax (`@import "tailwindcss"` instead of `@tailwind` directives)
3. ✅ Fix the verification prompt's hardcoded "within 3 months" check — agent flagged March 2026 as a future date because the prompt didn't carry the current date as context. Pass `today` into the prompt explicitly.
