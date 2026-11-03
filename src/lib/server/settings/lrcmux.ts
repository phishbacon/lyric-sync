import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/server/db";
import { lyricSettings } from "@/lib/server/db/schema";
import { env } from "@/lib/server/env";

export const LRCMUX_SOURCES = [
  { id: "deezer", label: "Deezer" },
  { id: "genius", label: "Genius" },
  { id: "kugou", label: "KuGou" },
  { id: "lrclib", label: "LRCLIB" },
  { id: "musixmatch", label: "Musixmatch" },
  { id: "netease", label: "NetEase" },
  { id: "ytmusic", label: "YouTube Music" },
] as const;

export type SourceId = typeof LRCMUX_SOURCES[number]["id"];
const sourceIds = LRCMUX_SOURCES.map(source => source.id);

export const lrcmuxSettingsSchema = z.object({
  baseUrl: z.url().trim().refine(value => {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
      && !url.search && !url.hash;
  }, "Use an HTTP(S) address without credentials, query, or fragment")
    .transform(value => value.replace(/\/$/, "")),
  preferSynced: z.boolean(),
  enabledSources: z.array(z.enum(sourceIds as [SourceId, ...SourceId[]]))
    .min(1, "Enable at least one source")
    .refine(sources => new Set(sources).size === sources.length, "Duplicate sources"),
});

export type LrcmuxSettings = z.infer<typeof lrcmuxSettingsSchema>;

export function defaultLrcmuxSettings(): LrcmuxSettings {
  return { baseUrl: env.LRCMUX_BASE_URL.replace(/\/$/, ""), preferSynced: false, enabledSources: [...sourceIds] };
}

export async function getLrcmuxSettings(): Promise<LrcmuxSettings> {
  const row = await db.query.lyricSettings.findFirst({
    where: eq(lyricSettings.id, 1),
  });
  if (!row) return defaultLrcmuxSettings();
  return lrcmuxSettingsSchema.parse({
    baseUrl: row.baseUrl,
    preferSynced: row.preferSynced,
    enabledSources: JSON.parse(row.enabledSources) as unknown,
  });
}
