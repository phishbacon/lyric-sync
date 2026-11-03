import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LibraryControls } from "@/components/library/library-controls";
import { LibraryHeading } from "@/components/library/library-heading";
import { LibrarySyncAll } from "@/components/library/library-sync-all";
import { ListingPagination } from "@/components/library/listing-pagination";
import { MediaArt } from "@/components/media/art";
import { SyncEvents } from "@/components/sync/sync-events";
import { encodePlexId } from "@/lib/plex-id";
import { db } from "@/lib/server/db";
import { ALBUM_PAGE_SIZE, getAlbumListing, parseListingFilters } from "@/lib/server/db/library-listings";
import { libraries } from "@/lib/server/db/schema";

export const dynamic = "force-dynamic";

export default async function AlbumsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const active = await db.query.libraries.findFirst({ where: eq(libraries.active, true) });
  if (!active) redirect("/setup/select-library");
  const filters = parseListingFilters(await searchParams, "albums");
  const { items, total } = await getAlbumListing(active.uuid, filters);

  return (
    <div className="space-y-6">
      <SyncEvents />
      <LibraryHeading title={active.title} count={total} noun="albums" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <LibraryControls kind="albums" filters={filters} />
        <LibrarySyncAll kind="albums" filters={filters} />
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-muted">
          {total > 0 ? "No albums on this page." : filters.q || filters.status !== "all"
            ? "No albums match your filters. Use Clear Filters to show all albums." : "No albums found in this library."}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map(album => (
            <li key={album.uuid}>
              <Link href={`/library/album/${encodePlexId(album.uuid)}`} className="group block space-y-2">
                <div className="overflow-hidden rounded-lg border border-border bg-surface transition group-hover:border-accent">
                  <MediaArt src={album.image} alt={album.title} variant="square" />
                </div>
                <div className="space-y-0.5">
                  <p className="truncate text-sm font-medium" title={album.title}>{album.title}</p>
                  <p className="truncate text-xs text-muted">{album.artistTitle ?? "Unknown Artist"}{album.year ? ` · ${album.year}` : ""}</p>
                  <p className="text-xs text-muted">{album.syncedTracks} / {album.trackCount} tracks synced</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <ListingPagination path="/library/albums" params={{ q: filters.q, status: filters.status, sort: filters.sort }}
        page={filters.page} total={total} pageSize={ALBUM_PAGE_SIZE} />
    </div>
  );
}
