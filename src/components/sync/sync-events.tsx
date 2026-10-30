"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Subscribes to the global sync SSE stream, scoped to one album or artist
 * UUID (the server filters events by ancestry). Every matching job event
 * triggers a router refresh so badges and counts re-render from the DB.
 */
export function SyncEvents({ uuid }: { uuid: string }) {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource(`/api/sync/events?uuid=${encodeURIComponent(uuid)}`);

    // Refresh on any event for this scope; the server already filtered.
    // Debounce bursts (a batch finishing several jobs at once).
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onEvent = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 150);
    };

    source.addEventListener("message", onEvent);
    return () => {
      clearTimeout(timer);
      source.close();
    };
  }, [uuid, router]);

  return null;
}
