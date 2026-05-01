export type AgentEvent = {
  timestamp: number;
  agent: string;
  status: 'running' | 'done' | 'error';
  message: string;
};

export type ExtractedFields = {
  documentType: string;
  fields: Record<string, string | number | boolean | null>;
  rawText?: string;
};

export type VerificationResult = {
  verdict: 'PASS' | 'NEEDS_REVIEW' | 'FAIL';
  score: number; // 0–100
  checks: { label: string; passed: boolean; note?: string }[];
  summary: string;
};

export type Job = {
  id: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  fileName: string;
  fileType: string;
  createdAt: number;
  events: AgentEvent[];
  extraction?: ExtractedFields;
  verification?: VerificationResult;
  error?: string;
};

// In-memory store — fine for demo
const jobs = new Map<string, Job>();

// SSE subscribers per job
const subscribers = new Map<string, Set<(event: AgentEvent) => void>>();

export function createJob(id: string, fileName: string, fileType: string): Job {
  const job: Job = {
    id,
    status: 'pending',
    fileName,
    fileType,
    createdAt: Date.now(),
    events: [],
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function pushEvent(jobId: string, event: AgentEvent) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.events.push(event);
  // Notify SSE subscribers
  subscribers.get(jobId)?.forEach((cb) => cb(event));
}

export function updateJob(jobId: string, update: Partial<Job>) {
  const job = jobs.get(jobId);
  if (!job) return;
  Object.assign(job, update);
}

export function subscribeToJob(jobId: string, cb: (event: AgentEvent) => void): () => void {
  if (!subscribers.has(jobId)) subscribers.set(jobId, new Set());
  subscribers.get(jobId)!.add(cb);
  return () => subscribers.get(jobId)?.delete(cb);
}
