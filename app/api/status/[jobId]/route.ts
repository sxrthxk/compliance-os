import { NextRequest } from 'next/server';
import { getJob, subscribeToJob, AgentEvent } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job) {
    return new Response('Job not found', { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      // Send all existing events first
      for (const event of job.events) {
        send({ type: 'event', event });
      }

      // If job is already done, send final state and close
      if (job.status === 'done' || job.status === 'error') {
        send({ type: 'complete', job });
        controller.close();
        return;
      }

      // Subscribe to new events
      const unsubscribe = subscribeToJob(jobId, (event: AgentEvent) => {
        send({ type: 'event', event });

        // Check if pipeline is complete after this event
        const currentJob = getJob(jobId);
        if (currentJob?.status === 'done' || currentJob?.status === 'error') {
          send({ type: 'complete', job: currentJob });
          unsubscribe();
          controller.close();
        }
      });

      // Cleanup on disconnect
      req.signal.addEventListener('abort', () => {
        unsubscribe();
        controller.close();
      });

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);
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
