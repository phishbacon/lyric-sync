"use server";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/server/db";
import { eligibleTrackSelection, parseListingFilters, type ListingKind } from "@/lib/server/db/library-listings";
import { libraries } from "@/lib/server/db/schema";
import { enqueueLibrarySelection } from "@/lib/server/jobs/worker";

async function activeLibraryUuid(): Promise<string> {
  const active = await db.query.libraries.findFirst({
    where: eq(libraries.active, true), columns: { uuid: true },
  });
  if (!active) throw new Error("No active library selected");
  return active.uuid;
}

function validatedSelection(kind: ListingKind, query: Record<string, string>) {
  if (!["artists", "albums", "tracks"].includes(kind)) throw new Error("Unknown library view");
  return kind === "artists" ? { q: "", status: "all", sort: "title", page: 1 }
    : parseListingFilters(query, kind);
}

export async function previewLibrarySync(kind: ListingKind, query: Record<string, string>) {
  const libraryUuid = await activeLibraryUuid();
  const eligible = eligibleTrackSelection(libraryUuid, kind, validatedSelection(kind, query));
  const counted = await db.select({ count: sql<number>`count(*)` }).from(eligible.as("eligible"));
  return Number(counted[0]?.count ?? 0);
}

export async function syncLibraryView(kind: ListingKind, query: Record<string, string>) {
  const libraryUuid = await activeLibraryUuid();
  const queued = await enqueueLibrarySelection(libraryUuid, kind, validatedSelection(kind, query));
  return {
    queued,
    message: queued === 0 ? "No eligible tracks to sync." : `Queued ${queued} track${queued === 1 ? "" : "s"} for sync.`,
  };
}
