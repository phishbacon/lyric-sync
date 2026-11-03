import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { syncSingleTrack } from "@/app/library/album/[uuid]/actions";
import { LibraryControls } from "@/components/library/library-controls";
import { LibraryHeading } from "@/components/library/library-heading";
import { LibrarySyncAll } from "@/components/library/library-sync-all";
import { ListingPagination } from "@/components/library/listing-pagination";
import { SyncStatusBadge } from "@/components/media/track-status";
import { SyncEvents } from "@/components/sync/sync-events";
import { TrackSyncButton } from "@/components/sync/track-sync-button";
import { formatDuration } from "@/lib/format-duration";
import { encodePlexId } from "@/lib/plex-id";
import { db } from "@/lib/server/db";
import { getTrackListing, parseListingFilters, TRACK_PAGE_SIZE } from "@/lib/server/db/library-listings";
import { libraries } from "@/lib/server/db/schema";

export const dynamic = "force-dynamic";

export default async function TracksPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const active = await db.query.libraries.findFirst({ where: eq(libraries.active, true) });
  if (!active) redirect("/setup/select-library");
  const filters = parseListingFilters(await searchParams, "tracks");
  const { items, total } = await getTrackListing(active.uuid, filters);

  return (
    <div className="space-y-6">
      <SyncEvents />
      <LibraryHeading title={active.title} count={total} noun="tracks" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <LibraryControls kind="tracks" filters={filters} />
        <LibrarySyncAll kind="tracks" filters={filters} />
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-muted">
          {total > 0 ? "No tracks on this page." : filters.status === "unsynced" && !filters.q
            ? "All tracks are synchronized." : filters.q || filters.status !== "all"
              ? "No tracks match your search or filters. Use Clear Filters to reset." : "No tracks found in this library."}
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-surface sm:block">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Artist</th>
                <th className="px-4 py-3 font-medium">Album</th>
                <th className="px-4 py-3 text-right font-medium">Duration</th>
                <th className="px-4 py-3 text-right font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr></thead>
              <tbody>{items.map(track => (
                <tr key={track.key} className="border-b border-border last:border-0">
                  <td className="max-w-60 truncate px-4 py-3">
                    {/* Native fragment navigation activates :target for the highlighted album row. */}
                    <a href={`/library/album/${encodePlexId(track.albumUuid)}#track-${encodePlexId(track.key)}`} className="hover:text-accent">{track.title}</a>
                  </td>
                  <td className="max-w-44 truncate px-4 py-3 text-muted">{track.artistTitle ?? "Unknown Artist"}</td>
                  <td className="max-w-44 truncate px-4 py-3 text-muted">{track.albumTitle ?? "Unknown Album"}</td>
                  <td className="px-4 py-3 text-right text-muted">{formatDuration(track.duration)}</td>
                  <td className="px-4 py-3 text-right" title={track.error ?? undefined}>
                    <SyncStatusBadge status={track.syncStatus} />
                  </td>
                  <td className="px-4 py-2 text-right"><TrackSyncButton action={syncSingleTrack.bind(null, track.key)} syncing={track.syncing} synced={track.synced} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface sm:hidden">
            {items.map(track => (
              <li key={track.key} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 space-y-1">
                  <a href={`/library/album/${encodePlexId(track.albumUuid)}#track-${encodePlexId(track.key)}`}
                    className="block truncate text-sm font-medium hover:text-accent">{track.title}</a>
                  <p className="truncate text-xs text-muted">{track.artistTitle ?? "Unknown Artist"} · {track.albumTitle ?? "Unknown Album"}</p>
                  <span title={track.error ?? undefined}><SyncStatusBadge status={track.syncStatus} /></span>
                </div>
                <TrackSyncButton action={syncSingleTrack.bind(null, track.key)} syncing={track.syncing} synced={track.synced} />
              </li>
            ))}
          </ul>
        </>
      )}
      <ListingPagination path="/library/tracks" params={{ q: filters.q, status: filters.status, sort: filters.sort }}
        page={filters.page} total={total} pageSize={TRACK_PAGE_SIZE} />
    </div>
  );
}
