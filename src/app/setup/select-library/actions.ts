"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { libraries } from "@/lib/server/db/schema";
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
  }
  catch (cause) {
    const message = cause instanceof PlexApiError
      ? cause.message
      : String(cause);
    return { success: false, message };
  }
}

export async function selectLibrary(input: { libraryUuid: string }): Promise<SelectLibraryResult> {
  const server = await db.query.servers.findFirst();
  if (!server) {
    return { success: false, message: "No server configured" };
  }

  const target = await db.query.libraries.findFirst({
    where: eq(libraries.uuid, input.libraryUuid),
  });
  if (!target) {
    return { success: false, message: "Library not found — fetch libraries first" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(libraries)
      .set({ active: false })
      .where(and(eq(libraries.serverId, server.id), eq(libraries.active, true)));
    await tx
      .update(libraries)
      .set({ active: true })
      .where(eq(libraries.uuid, input.libraryUuid));
  });

  revalidatePath("/", "layout");
  return { success: true, message: `Selected "${target.title}"` };
}
