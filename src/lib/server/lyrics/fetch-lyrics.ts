import type { LyricsQuery, LyricsRecord } from "@/lib/server/lyrics/matching";

import { logger } from "@/lib/logger";
import { fetchLrcmuxLyrics } from "@/lib/server/lyrics/lrcmux";
import { getLrcmuxSettings } from "@/lib/server/settings/lrcmux";

export async function fetchLyrics(query: LyricsQuery): Promise<LyricsRecord | null> {
  const settings = await getLrcmuxSettings();
  const result = await fetchLrcmuxLyrics(query, settings);
  if (result) {
    logger.info({ provider: "lrcmux", synced: Boolean(result.syncedLyrics) }, "Lyrics found");
  }
  return result;
}
