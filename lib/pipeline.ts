import { v4 as uuidv4 } from 'uuid';
import { createJob, pushEvent, updateJob, getJob } from './store';
import { runAgent01 } from './agents/agent01-ingestion';
import { runAgent02 } from './agents/agent02-verification';

export function startPipeline(fileBuffer: Buffer, fileName: string, mimeType: string): string {
  const jobId = uuidv4();
  createJob(jobId, fileName, mimeType);

  // Run async, don't await
  runPipeline(jobId, fileBuffer, fileName, mimeType).catch((err) => {
    updateJob(jobId, { status: 'error', error: String(err) });
    pushEvent(jobId, {
      timestamp: Date.now(),
      agent: 'system',
      status: 'error',
      message: `Pipeline failed: ${String(err)}`,
    });
  });

  return jobId;
}

async function runPipeline(jobId: string, fileBuffer: Buffer, fileName: string, mimeType: string) {
  updateJob(jobId, { status: 'processing' });

  // ─── Agent 01 ───────────────────────────────────────────────
  pushEvent(jobId, {
    timestamp: Date.now(),
    agent: 'Agent 01',
    status: 'running',
    message: 'Document received. Detecting type...',
  });

  await sleep(600);

  pushEvent(jobId, {
    timestamp: Date.now(),
    agent: 'Agent 01',
    status: 'running',
    message: 'Parsing document with vision model...',
  });

  const extraction = await runAgent01(fileBuffer, fileName, mimeType);

  updateJob(jobId, { extraction });

  pushEvent(jobId, {
    timestamp: Date.now(),
    agent: 'Agent 01',
    status: 'done',
    message: `Extraction complete — ${extraction.documentType} detected. ${Object.keys(extraction.fields).length} fields extracted.`,
  });

  await sleep(400);

  // ─── Agent 02 ───────────────────────────────────────────────
  pushEvent(jobId, {
    timestamp: Date.now(),
    agent: 'Agent 02',
    status: 'running',
    message: 'Starting compliance verification checks...',
  });

  await sleep(500);

  pushEvent(jobId, {
    timestamp: Date.now(),
    agent: 'Agent 02',
    status: 'running',
    message: 'Running rule-based and AI verification...',
  });

  const verification = await runAgent02(extraction);

  updateJob(jobId, { verification });

  pushEvent(jobId, {
    timestamp: Date.now(),
    agent: 'Agent 02',
    status: 'done',
    message: `Verification complete — Verdict: ${verification.verdict} (Score: ${verification.score}/100)`,
  });

  // ─── Done ────────────────────────────────────────────────────
  updateJob(jobId, { status: 'done' });

  pushEvent(jobId, {
    timestamp: Date.now(),
    agent: 'system',
    status: 'done',
    message: 'Pipeline complete.',
  });
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
