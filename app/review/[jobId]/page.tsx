'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AgentFeed from '@/components/AgentFeed';
import ResultsDashboard from '@/components/ResultsDashboard';
import { AgentEvent, ExtractedFields, VerificationResult } from '@/lib/store';

type JobState = {
  status: string;
  fileName: string;
  events: AgentEvent[];
  extraction?: ExtractedFields;
  verification?: VerificationResult;
  error?: string;
};

export default function ReviewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();

  const [job, setJob] = useState<JobState | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const es = new EventSource(`/api/status/${jobId}`);

    es.onmessage = (e) => {
      const msg = JSON.parse(e.data);

      if (msg.type === 'event') {
        setEvents((prev) => [...prev, msg.event]);
      }

      if (msg.type === 'complete') {
        setJob(msg.job);
        setEvents(msg.job.events);
        setIsComplete(true);
        es.close();
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [jobId]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Nav */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm font-mono mb-10 transition-colors"
        >
          ← New document
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center text-black font-bold text-xs">C</div>
            <span className="font-mono text-zinc-400 text-sm tracking-tight">ComplianceOS</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {job ? job.fileName : 'Processing document...'}
          </h1>
          <p className="text-zinc-500 font-mono text-xs mt-1">Job ID: {jobId}</p>
        </div>

        {/* Agent Feed — always visible */}
        <div className="mb-8">
          <AgentFeed events={events} isComplete={isComplete} />
        </div>

        {/* Results — shown after completion */}
        {isComplete && job?.extraction && job?.verification && (
          <ResultsDashboard
            fileName={job.fileName}
            extraction={job.extraction}
            verification={job.verification}
          />
        )}

        {/* Error state */}
        {isComplete && job?.error && (
          <div className="rounded-xl bg-red-950/40 border border-red-800 p-5 text-red-300">
            <p className="font-mono text-xs uppercase tracking-widest mb-2 text-red-500">Pipeline Error</p>
            <p className="text-sm">{job.error}</p>
          </div>
        )}
      </div>
    </main>
  );
}
