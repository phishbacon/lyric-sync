import { EventEmitter } from "node:events";

/**
 * In-process job event bus feeding the SSE stream.
 *
 * Stashed on globalThis so the worker (started from instrumentation.ts) and
 * the /api/sync/events route handler — which may load separate module
 * instances under dev bundling — always share one emitter.
 */
export interface JobEvent {
  jobId: number;
  kind: "sync_track" | "plex_fetch";
  status: "queued" | "running" | "done" | "failed";
  targetUuid: string | null;
  error?: string;
}

const globalStore = globalThis as typeof globalThis & {
  __lyricSyncJobEvents?: EventEmitter;
};

const emitter = globalStore.__lyricSyncJobEvents ??= new EventEmitter();
// One listener per open SSE stream; browsers can hold several tabs.
emitter.setMaxListeners(0);

export function emitJobEvent(event: JobEvent): void {
  emitter.emit("job", event);
}

/** Subscribe; returns an unsubscribe function. */
export function onJobEvent(
  listener: (event: JobEvent) => void,
): () => void {
  emitter.on("job", listener);
  return () => emitter.off("job", listener);
}
