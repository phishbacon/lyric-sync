"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface SyncOutcome {
  queued: number;
  message: string;
}

/**
 * Per-track sync button: the page passes syncSingleTrack.bind(null, key),
 * which always forces a fresh lrclib attempt (upgrading a .txt to .lrc
 * alongside it). Live status arrives via the page's SSE stream.
 */
export function TrackSyncButton({
  action,
}: {
  action: () => Promise<SyncOutcome>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

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
        disabled={pending}
        title="Sync lyrics for this track"
        aria-label="Sync lyrics for this track"
        className="rounded-md p-1.5 text-muted hover:bg-surface-raised hover:text-foreground disabled:opacity-50"
      >
        {pending
          ? <Loader2 className="size-4 animate-spin" />
          : <RefreshCw className="size-4" />}
      </button>
    </span>
  );
}
