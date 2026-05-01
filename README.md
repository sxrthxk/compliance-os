# ComplianceOS — KYC Document Verification Demo

Multi-agent AI pipeline for KYC document processing. Built with Next.js + Claude API.

## Supported Document Types
- Bank Statements
- Salary Slips
- Form 26AS
- Rent Agreements
- eMandate / NACH Forms

## Setup

```bash
npm install
```

Create `.env.local`:
```
ANTHROPIC_API_KEY=your_key_here
```

## Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

```bash
npx vercel
```

Set `ANTHROPIC_API_KEY` in Vercel environment variables.

## Test Documents

Put your real docs in `test-docs/real/` (gitignored).  
Synthetic test docs go in `test-docs/synthetic/`.

## Architecture

```
Upload → /api/process → Pipeline → Agent 01 (extraction) → Agent 02 (verification)
                                         ↓ SSE stream
                              /review/[jobId] — live feed + dashboard
```
