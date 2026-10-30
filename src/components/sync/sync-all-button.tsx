"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface SyncOutcome {
  queued: number;
  message: string;
}

/**
 * "Sync All" button for an album or artist page. The server page passes a
 * bound server action (syncAlbum.bind(null, uuid) or the artist equivalent)
 * that queues one job per unsynced track; live updates arrive via SSE.
 */
export function SyncAllButton({
  action,
}: {
  action: () => Promise<SyncOutcome>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const outcome = await action();
      setMessage(outcome.message);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Sync All
      </button>
      {message && <p className="text-xs text-muted">{message}</p>}
    </div>
  );
}
