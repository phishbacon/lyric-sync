"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import type { ListingFilters } from "@/lib/server/db/library-listings";

const albumStatuses = [
  ["all", "All albums"], ["complete", "Fully synchronized"],
  ["partial", "Partially synchronized"], ["none", "Not synchronized"],
];
const trackStatuses = [
  ["all", "All tracks"], ["synced", "Synced"],
  ["unsynced", "Unsynced"], ["failed", "Failed"],
];
const albumSorts = [["title", "Album title"], ["artist", "Artist"], ["year", "Release year (newest)"]];
const trackSorts = [["title", "Track title"], ["artist", "Artist"], ["album", "Album"]];

export function LibraryControls({ kind, filters }: { kind: "albums" | "tracks"; filters: ListingFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [query, setQuery] = useState(filters.q);

  useEffect(() => setQuery(filters.q), [filters.q]);

  function update(changes: Record<string, string>) {
    const params = new URLSearchParams(search.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === "all" || (key === "sort" && value === "title")) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update({ q: query.trim() });
  }

  const controlsClass = "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none sm:w-auto";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <form onSubmit={submit} role="search" className="flex w-full gap-2 sm:w-auto">
        <input
          aria-label={`Search ${kind}`}
          placeholder={kind === "albums" ? "Search albums or artists" : "Search tracks, artists or albums"}
          value={query}
          maxLength={200}
          onChange={event => setQuery(event.target.value)}
          className={`${controlsClass} min-w-0 flex-1`}
        />
        <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm hover:border-accent">Search</button>
      </form>
      <label className="flex items-center gap-2 text-xs text-muted">
        Status
        <select aria-label="Filter synchronization" value={filters.status}
          onChange={event => update({ status: event.target.value })} className={controlsClass}>
          {(kind === "albums" ? albumStatuses : trackStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs text-muted">
        Sort
        <select aria-label="Sort by" value={filters.sort}
          onChange={event => update({ sort: event.target.value })} className={controlsClass}>
          {(kind === "albums" ? albumSorts : trackSorts).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      {(filters.q || filters.status !== "all" || filters.sort !== "title") && (
        <button type="button" onClick={() => { setQuery(""); router.push(pathname, { scroll: false }); }}
          className="text-xs text-muted underline hover:text-foreground">Clear Filters</button>
      )}
    </div>
  );
}
