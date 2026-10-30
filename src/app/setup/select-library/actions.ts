"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/server/db";
import { libraries } from "@/lib/server/db/schema";
import { enqueuePlexFetch } from "@/lib/server/jobs/worker";
import { listMusicLibraries, PlexApiError } from "@/lib/server/plex/client";

export interface SelectLibraryResult {
  success: boolean;
  message: string;
}

export async function fetchLibraries(): Promise<
  | { success: true; libraries: Array<{ uuid: string; title: string; path: string; image: string | null }> }
  | { success: false; message: string }
> {
  const server = await db.query.servers.findFirst();
  if (!server) {
    return { success: false, message: "No server configured" };
  }

  try {
    const sections = await listMusicLibraries({
      baseUrl: server.baseUrl,
      token: server.xPlexToken,
      clientIdentifier: server.clientIdentifier,
    });

    return {
      success: true,
      libraries: sections.map(section => ({
        uuid: section.uuid,
        title: section.title,
        path: section.Location?.[0]?.path ?? "",
        image: section.composite ?? null,
      })),
    };
  } catch (cause) {
    const message = cause instanceof PlexApiError
      ? cause.message
      : String(cause);
    return { success: false, message };
  }
}

export interface SelectedLibraryInput {
  uuid: string;
  title: string;
  path: string;
  image: string | null;
}

export async function selectLibrary(input: SelectedLibraryInput): Promise<SelectLibraryResult> {
  const server = await db.query.servers.findFirst();
  if (!server) {
    return { success: false, message: "No server configured" };
  }

  if (input.path === "") {
    return { success: false, message: "Plex reported no filesystem path for this library" };
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(libraries)
      .values({
        uuid: input.uuid,
        title: input.title,
        path: input.path,
        image: input.image,
        key: `/library/sections/${input.uuid}`,
        serverId: server.id,
        active: true,
      })
      .onConflictDoUpdate({
        target: libraries.uuid,
        set: {
          title: input.title,
          path: input.path,
          image: input.image,
          active: true,
        },
      });

    await tx
      .update(libraries)
      .set({ active: false })
      .where(and(
        eq(libraries.serverId, server.id),
        eq(libraries.active, true),
      ));
    await tx
      .update(libraries)
      .set({ active: true })
      .where(eq(libraries.uuid, input.uuid));
  });

  // Kick off background ingestion; browsing pages poll until it completes.
  await enqueuePlexFetch(input.uuid);

  revalidatePath("/", "layout");
  return { success: true, message: `Selected "${input.title}" — importing from Plex` };
}
