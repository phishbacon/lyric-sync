import { eq } from "drizzle-orm";

import { db } from "@/lib/server/db";
import { tracks } from "@/lib/server/db/schema";
import { onJobEvent, type JobEvent } from "@/lib/server/jobs/events";

// One long-lived stream per browser — never prerendered or cached.
export const dynamic = "force-dynamic";

/** Keep proxies and dead sockets from holding a silent stream open. */
const HEARTBEAT_MS = 15_000;

/**
 * Does this event belong on a page scoped to `uuid` (an album or artist)?
 * sync_track events target a track key, so resolve its ancestry; a track
 * matches if it belongs to the album or artist directly.
 */
async function eventMatchesUuid(event: JobEvent, uuid: string): Promise<boolean> {
  if (event.targetUuid === uuid) {
    return true;
  }
  if (event.kind !== "sync_track" || event.targetUuid === null) {
    return false;
  }
  const track = await db.query.tracks.findFirst({
    where: eq(tracks.key, event.targetUuid),
    columns: { albumUuid: true, artistUuid: true },
  });
  return track !== undefined
    && (track.albumUuid === uuid || track.artistUuid === uuid);
}

export async function GET(request: Request): Promise<Response> {
  const uuid = new URL(request.url).searchParams.get("uuid");
  const encoder = new TextEncoder();

  let closed = false;
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        if (closed) {
          return;
        }
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Controller already closed by abort — nothing to do.
        }
      };

      const unsubscribe = onJobEvent(event => {
        void (async () => {
          if (uuid !== null && !(await eventMatchesUuid(event, uuid))) {
            return;
          }
          send(`data: ${JSON.stringify(event)}\n\n`);
        })();
      });

      const heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);

      cleanup = () => {
        closed = true;
        unsubscribe();
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      };

      request.signal.addEventListener("abort", cleanup);
      // Announce readiness so the client knows the stream is live.
      send(": open\n\n");
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}
