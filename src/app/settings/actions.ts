"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/server/db";
import { libraries, servers } from "@/lib/server/db/schema";
import { enqueuePlexFetch } from "@/lib/server/jobs/worker";
import { PlexApiError, testConnection } from "@/lib/server/plex/client";

export interface SettingsResult {
  success: boolean;
  message: string;
}

/**
 * Test the *saved* connection — the server row lives server-side, so the
 * token never reaches the browser (unlike onboarding, where the user is
 * still typing it).
 */
export async function testSavedConnection(): Promise<SettingsResult> {
  const server = await db.query.servers.findFirst();
  if (!server) {
    return { success: false, message: "No server configured" };
  }

  try {
    await testConnection({
      baseUrl: server.baseUrl,
      token: server.xPlexToken,
      clientIdentifier: server.clientIdentifier,
    });
    return { success: true, message: `Connected to ${server.baseUrl}` };
  } catch (cause) {
    const message = cause instanceof PlexApiError ? cause.message : String(cause);
    return { success: false, message };
  }
}

const renameSchema = z.string().trim().min(1, "Server name is required");

/** Rename the configured server (a display label; no effect on Plex). */
export async function renameServer(name: string): Promise<SettingsResult> {
  const parsed = renameSchema.safeParse(name);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues.map(issue => issue.message).join("; "),
    };
  }

  const server = await db.query.servers.findFirst();
  if (!server) {
    return { success: false, message: "No server configured" };
  }

  await db
    .update(servers)
    .set({ name: parsed.data })
    .where(eq(servers.id, server.id));

  revalidatePath("/", "layout");
  return { success: true, message: "Server renamed" };
}

/**
 * Re-enqueue ingestion for the active library. Upserts are idempotent, so a
 * refetch reconciles metadata, adds new files, and removes orphans without
 * touching lyric sync state.
 */
export async function refetchLibrary(): Promise<SettingsResult> {
  const active = await db.query.libraries.findFirst({
    where: eq(libraries.active, true),
  });
  if (!active) {
    return { success: false, message: "No active library — select one first" };
  }

  await enqueuePlexFetch(active.uuid);
  revalidatePath("/", "layout");
  return {
    success: true,
    message: `Re-fetching "${active.title}" from Plex`,
  };
}
