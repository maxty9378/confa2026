import { subscribe, getStatsSnapshot } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HEARTBEAT_INTERVAL_MS = 15000;

export async function GET() {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeatId: ReturnType<typeof setInterval> | null = null;
  const stream = new ReadableStream({
    start(controller) {
      getStatsSnapshot().then((stats) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(stats)}\n\n`)
          );
        } catch {
          // client closed
        }
      });
      unsubscribe = subscribe((stats) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(stats)}\n\n`)
          );
        } catch {
          // client closed
        }
      });
      heartbeatId = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ heartbeat: true })}\n\n`)
          );
        } catch {
          if (heartbeatId) clearInterval(heartbeatId);
        }
      }, HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      if (heartbeatId) clearInterval(heartbeatId);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-cache',
      Connection: 'keep-alive',
    },
  });
}
