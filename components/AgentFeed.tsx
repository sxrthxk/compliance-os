'use client';

import { useEffect, useRef } from 'react';

type SerializedAgentEvent = {
  timestamp: number;
  agent: string;
  status: 'running' | 'done' | 'error';
  message: string;
  highlight?: string;
};

interface Props {
  events: SerializedAgentEvent[];
  isComplete: boolean;
}

const agentColor: Record<string, string> = {
  'Agent 01': 'text-sky-400',
  'Agent 02': 'text-violet-400',
  system: 'text-zinc-500',
};

const statusIcon = (status: SerializedAgentEvent['status'], agent: string) => {
  if (agent === 'system' && status === 'done') return '✦';
  if (status === 'running') return '⟳';
  if (status === 'done') return '✓';
  if (status === 'error') return '✗';
  return '·';
};

const statusColor = (status: SerializedAgentEvent['status']) => {
  if (status === 'running') return 'text-amber-400 animate-pulse';
  if (status === 'done') return 'text-emerald-400';
  if (status === 'error') return 'text-red-400';
  return 'text-zinc-500';
};

export default function AgentFeed({ events, isComplete }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isComplete ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
        <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
          {isComplete ? 'Pipeline Complete' : 'Pipeline Running'}
        </span>
      </div>

      <div className="p-4 font-mono text-sm space-y-2 min-h-[200px] max-h-[340px] overflow-y-auto">
        {events.length === 0 && (
          <div className="flex items-center gap-2 text-zinc-600">
            <span className="animate-pulse">▸</span>
            <span>Initializing pipeline...</span>
          </div>
        )}

        {events.map((event, i) => (
          <div key={i} className="flex items-start gap-3 group">
            <span className="text-zinc-600 text-xs mt-0.5 w-16 shrink-0">
              {new Date(event.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className={`shrink-0 font-bold ${agentColor[event.agent] || 'text-zinc-400'}`}>
              {event.agent}
            </span>
            <span className={`shrink-0 ${statusColor(event.status)}`}>
              {statusIcon(event.status, event.agent)}
            </span>
            <span className="text-zinc-300 flex flex-wrap items-center gap-2">
              {event.message}
              {event.highlight && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/40 text-sky-300 text-xs font-mono font-semibold tracking-tight">
                  {event.highlight}
                </span>
              )}
            </span>
          </div>
        ))}

        {!isComplete && events.length > 0 && (
          <div className="flex items-center gap-2 text-zinc-600">
            <span className="animate-pulse">▸</span>
            <span className="animate-pulse">Processing...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
