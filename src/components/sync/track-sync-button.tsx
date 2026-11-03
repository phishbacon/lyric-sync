"use client";

import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface SyncOutcome {
  queued: number;
  message: string;
}

/**
 * Per-track sync button: the page passes syncSingleTrack.bind(null, key),
 * which always forces a fresh provider lookup (upgrading a .txt to .lrc
 * alongside it). Live status arrives via the page's SSE stream.
 */
export function TrackSyncButton({
  action,
  syncing,
  synced = false,
}: {
  action: () => Promise<SyncOutcome>;
  syncing: boolean;
  synced?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const busy = pending || syncing;

  function handleClick() {
    startTransition(async () => {
      const outcome = await action();
      setMessage(outcome.message);
      router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center justify-end gap-2">
      {message && <span className="text-xs text-muted">{message}</span>}
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-busy={busy}
        title={busy ? "Checking for existing lyrics or fetching lyrics" : "Re-check this track's lyrics"}
        aria-label={busy ? "Syncing lyrics for this track" : "Re-check this track's lyrics"}
        // `text-foreground/70` not `text-muted`: at muted grey an isolated
        // icon reads as decoration, not a control. The hover lift is the
        // affordance that says "this is a button".
        className="rounded-md p-1.5 text-foreground/70 hover:bg-surface-raised hover:text-foreground disabled:opacity-50"
      >
        {busy
          ? <Loader2 className="size-4 animate-spin" />
          : synced ? <CheckCircle2 className="size-4 text-accent" /> : <RefreshCw className="size-4" />}
      </button>
    </span>
  );
}
