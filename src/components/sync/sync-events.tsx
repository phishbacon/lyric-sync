"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Subscribes to the global sync SSE stream, scoped to one album or artist
 * UUID (the server filters events by ancestry). Every matching job event
 * triggers a router refresh so badges and counts re-render from the DB.
 */
export function SyncEvents({ uuid }: { uuid?: string }) {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource(uuid ? `/api/sync/events?uuid=${encodeURIComponent(uuid)}` : "/api/sync/events");

    // Refresh on any event for this scope; the server already filtered.
    // Debounce bursts (a batch finishing several jobs at once).
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onEvent = () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible") timer = setTimeout(() => router.refresh(), 250);
    };

    source.addEventListener("message", onEvent);
    if (!uuid) source.addEventListener("tasks", onEvent);
    const onVisible = () => { if (document.visibilityState === "visible") router.refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearTimeout(timer);
      source.close();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [uuid, router]);

  return null;
}
