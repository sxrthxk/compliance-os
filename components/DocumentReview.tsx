'use client';

import { useEffect, useState } from 'react';
import AgentFeed from './AgentFeed';
import ResultsDashboard from './ResultsDashboard';
import type { ExtractedFields, VerificationResult } from '@/lib/pipeline';

type SerializedAgentEvent = {
  timestamp: number;
  agent: string;
  status: 'running' | 'done' | 'error';
  message: string;
  highlight?: string;
};

interface Props {
  jobId: string;
  fileName: string;
  initialStatus: string;
  initialExtraction: ExtractedFields | null;
  initialVerification: VerificationResult | null;
  initialError: string | null;
}

export default function DocumentReview({
  jobId,
  fileName,
  initialStatus,
  initialExtraction,
  initialVerification,
  initialError,
}: Props) {
  const wasComplete = initialStatus === 'DONE' || initialStatus === 'ERROR';

  const [events, setEvents] = useState<SerializedAgentEvent[]>([]);
  const [extraction, setExtraction] = useState<ExtractedFields | null>(initialExtraction);
  const [verification, setVerification] = useState<VerificationResult | null>(initialVerification);
  const [error, setError] = useState<string | null>(initialError);
  const [isComplete, setIsComplete] = useState(wasComplete);

  useEffect(() => {
    const es = new EventSource(`/api/jobs/${jobId}/status`);

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'event') {
          setEvents((prev) => {
            // De-dup: don't append events we already have (server resends initial set)
            if (prev.some((p) => p.timestamp === msg.event.timestamp && p.message === msg.event.message)) {
              return prev;
            }
            return [...prev, msg.event];
          });
        } else if (msg.type === 'complete') {
          setIsComplete(true);
          if (msg.job.extraction) setExtraction(msg.job.extraction);
          if (msg.job.verification) setVerification(msg.job.verification);
          if (msg.job.error) setError(msg.job.error);
          es.close();
        }
      } catch {
        /* ignore malformed message */
      }
    };

    es.onerror = () => es.close();

    return () => es.close();
  }, [jobId]);

  return (
    <div>
      <div className="mb-8">
        <AgentFeed events={events} isComplete={isComplete} />
      </div>

      {isComplete && extraction && verification && (
        <ResultsDashboard fileName={fileName} extraction={extraction} verification={verification} />
      )}

      {isComplete && error && (
        <div className="rounded-xl bg-red-950/40 border border-red-800 p-5 text-red-300">
          <p className="font-mono text-xs uppercase tracking-widest mb-2 text-red-500">
            Pipeline Error
          </p>
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
