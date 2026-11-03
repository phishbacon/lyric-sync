"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/server/db";
import { libraries, lyricSettings, servers, tracks } from "@/lib/server/db/schema";
import { enqueuePlexFetch } from "@/lib/server/jobs/worker";
import { getAvailableSources } from "@/lib/server/lyrics/lrcmux";
import { PlexApiError, testConnection } from "@/lib/server/plex/client";
import {
  getLrcmuxSettings,
  lrcmuxSettingsSchema,
  type LrcmuxSettings,
} from "@/lib/server/settings/lrcmux";

export interface SettingsResult {
  success: boolean;
  message: string;
}

export async function saveLrcmuxSettings(input: LrcmuxSettings): Promise<SettingsResult> {
  const parsed = lrcmuxSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues.map(issue => issue.message).join("; "),
    };
  }

  const previous = await getLrcmuxSettings();
  const next = parsed.data;
  const changed = JSON.stringify(previous) !== JSON.stringify(next);
  if (changed) {
    await db.insert(lyricSettings).values({
      id: 1,
      baseUrl: next.baseUrl,
      preferSynced: next.preferSynced,
      enabledSources: JSON.stringify(next.enabledSources),
    }).onConflictDoUpdate({
      target: lyricSettings.id,
      set: {
        baseUrl: next.baseUrl,
        preferSynced: next.preferSynced,
        enabledSources: JSON.stringify(next.enabledSources),
      },
    });

    // Existing lyric files remain untouched. Missing tracks become eligible
    // for the next batch, but saving settings does not create new jobs.
    await db.update(tracks).set({ syncStatus: "pending" })
      .where(eq(tracks.syncStatus, "no_lyrics"));
  }

  revalidatePath("/settings");
  return { success: true, message: changed ? "LrcMux settings saved" : "No changes to save" };
}

export interface LrcmuxConnectionResult extends SettingsResult {
  sources?: string[];
}

export async function testLrcmuxConnection(baseUrl: string): Promise<LrcmuxConnectionResult> {
  const parsed = lrcmuxSettingsSchema.shape.baseUrl.safeParse(baseUrl);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues.map(issue => issue.message).join("; ") };
  }
  try {
    const sources = await getAvailableSources(parsed.data);
    return { success: true, message: `Connected — ${sources.length} active sources`, sources };
  } catch (cause) {
    return { success: false, message: String(cause) };
  }
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
