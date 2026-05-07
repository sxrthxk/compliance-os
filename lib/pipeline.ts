import { db } from './db';
import { runAgent01 } from './agents/agent01-ingestion';
import { runAgent02 } from './agents/agent02-verification';
import { readFile } from './storage';
import type { Job, AgentEvent } from '@prisma/client';

/**
 * Shared types that components import. Kept here so the upgrade from in-memory
 * to Prisma was mechanical.
 */
export type ExtractedFields = {
  documentType: string;
  fields: Record<string, string | number | boolean | null>;
  rawText?: string;
};

export type VerificationResult = {
  verdict: 'PASS' | 'NEEDS_REVIEW' | 'FAIL';
  score: number;
  checks: { label: string; passed: boolean; note?: string }[];
  summary: string;
};

export type { Job, AgentEvent };

/**
 * Kick off a verification pipeline for an existing Document.
 * Returns the created Job ID. Pipeline runs async; clients poll /api/jobs/[id]/status.
 */
export async function startPipelineForDocument(documentId: string): Promise<string> {
  const job = await db.job.create({
    data: {
      documentId,
      status: 'PENDING',
    },
  });

  // Fire and forget. Errors are caught and persisted onto the job.
  runPipeline(job.id, documentId).catch(async (err) => {
    await db.job.update({
      where: { id: job.id },
      data: { status: 'ERROR', error: String(err), completedAt: new Date() },
    });
    await db.agentEvent.create({
      data: {
        jobId: job.id,
        agent: 'system',
        status: 'error',
        message: `Pipeline failed: ${String(err)}`,
      },
    });
  });

  return job.id;
}

async function runPipeline(jobId: string, documentId: string) {
  const doc = await db.document.findUnique({ where: { id: documentId } });
  if (!doc) throw new Error(`Document ${documentId} not found`);

  await db.job.update({
    where: { id: jobId },
    data: { status: 'PROCESSING' },
  });

  // ─── Agent 01 ───────────────────────────────────────────────
  await pushEvent(jobId, 'Agent 01', 'running', 'Document received. Detecting type...');
  await sleep(400);
  await pushEvent(jobId, 'Agent 01', 'running', 'Parsing document with vision model...');

  // Storage path was saved at upload time — strip the /api/files/ prefix back to relative path
  const storagePath = doc.fileUrl.replace(/^\/api\/files\//, '');
  const fileBuffer = await readFile(storagePath);

  const extraction = await runAgent01(fileBuffer, doc.fileName, doc.fileType);

  await db.job.update({
    where: { id: jobId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { extraction: extraction as any },
  });

  await pushEvent(
    jobId,
    'Agent 01',
    'done',
    `Extraction complete — ${Object.keys(extraction.fields).length} fields extracted from`,
    extraction.documentType
  );

  await sleep(300);

  // ─── Agent 02 ───────────────────────────────────────────────
  await pushEvent(jobId, 'Agent 02', 'running', 'Starting compliance verification checks...');
  await sleep(300);
  await pushEvent(jobId, 'Agent 02', 'running', 'Running rule-based and AI verification...');

  const verification = await runAgent02(extraction);

  await db.job.update({
    where: { id: jobId },
    data: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      verification: verification as any,
      status: 'DONE',
      completedAt: new Date(),
    },
  });

  await pushEvent(
    jobId,
    'Agent 02',
    'done',
    `Verification complete — Verdict: ${verification.verdict} (Score: ${verification.score}/100)`
  );

  await pushEvent(jobId, 'system', 'done', 'Pipeline complete.');
}

async function pushEvent(
  jobId: string,
  agent: string,
  status: string,
  message: string,
  highlight?: string
) {
  await db.agentEvent.create({
    data: { jobId, agent, status, message, highlight },
  });
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
