import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Streams job events via SSE. Polls the DB for new events at a short interval.
 * Closes when job is DONE or ERROR.
 *
 * Yes, polling. For Phase 3 this is fine. Future upgrade path: Postgres LISTEN/NOTIFY
 * via a long-lived connection, or move to a pub/sub like Pusher/Ably.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id: jobId } = await params;

  // Verify the job belongs to a doc → applicant → user owned by this caller
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { document: { include: { applicant: true } } },
  });
  if (!job || job.document.applicant.userId !== user.id) {
    return new Response('Not found', { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      let lastEventTimestamp: Date | null = null;
      let closed = false;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(pollInterval);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // Initial: send everything we have so far
      const initialEvents = await db.agentEvent.findMany({
        where: { jobId },
        orderBy: { timestamp: 'asc' },
      });
      for (const ev of initialEvents) {
        send({ type: 'event', event: serialize(ev) });
        lastEventTimestamp = ev.timestamp;
      }

      // If already complete, send final and close
      const initialJob = await db.job.findUnique({ where: { id: jobId } });
      if (initialJob?.status === 'DONE' || initialJob?.status === 'ERROR') {
        send({ type: 'complete', job: serializeJob(initialJob) });
        cleanup();
        return;
      }

      // Poll for new events
      const pollInterval = setInterval(async () => {
        if (closed) return;
        try {
          const newEvents = await db.agentEvent.findMany({
            where: {
              jobId,
              ...(lastEventTimestamp ? { timestamp: { gt: lastEventTimestamp } } : {}),
            },
            orderBy: { timestamp: 'asc' },
          });

          for (const ev of newEvents) {
            send({ type: 'event', event: serialize(ev) });
            lastEventTimestamp = ev.timestamp;
          }

          const currentJob = await db.job.findUnique({ where: { id: jobId } });
          if (currentJob?.status === 'DONE' || currentJob?.status === 'ERROR') {
            send({ type: 'complete', job: serializeJob(currentJob) });
            cleanup();
          }
        } catch (err) {
          console.error('SSE poll error:', err);
          send({ type: 'error', message: 'Polling error' });
          cleanup();
        }
      }, 500);

      // Keep-alive heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          cleanup();
        }
      }, 15000);

      // Cleanup on disconnect
      req.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialize(ev: any) {
  return {
    timestamp: ev.timestamp.getTime(),
    agent: ev.agent,
    status: ev.status,
    message: ev.message,
    highlight: ev.highlight ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeJob(job: any) {
  return {
    id: job.id,
    status: job.status.toLowerCase(),
    extraction: job.extraction,
    verification: job.verification,
    error: job.error,
  };
}
