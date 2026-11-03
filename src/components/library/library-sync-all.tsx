"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { ListingFilters, ListingKind } from "@/lib/server/db/library-listings";

import { previewLibrarySync, syncLibraryView } from "@/app/library/actions";

export function LibrarySyncAll({ kind, filters }: { kind: ListingKind; filters?: ListingFilters }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const query: Record<string, string> = filters ? { q: filters.q, status: filters.status, sort: filters.sort } : {};
  function sync() {
    startTransition(async () => {
      try {
        const eligible = await previewLibrarySync(kind, query);
        if (eligible === 0) {
          setMessage("No eligible tracks to sync.");
          return;
        }
        if (eligible > 100 && !window.confirm(`Synchronize ${eligible.toLocaleString()} tracks?`)) return;
        const result = await syncLibraryView(kind, query);
        setMessage(result.message);
        router.refresh();
      } catch {
        setMessage("Could not queue synchronization. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={sync} disabled={pending} type="button"
        className="flex shrink-0 items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Sync All
      </button>
      {message && <span role="status" className="max-w-52 text-right text-xs text-muted">{message}</span>}
    </div>
  );
}
