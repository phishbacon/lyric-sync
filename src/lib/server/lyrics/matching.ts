/** Shared metadata gate for LrcMux results; providers may return a remix or a cover. */
export interface LyricsQuery {
  artistName: string;
  trackName: string;
  albumName: string | null;
  durationSec: number | null;
}

export interface LyricsRecord {
  syncedLyrics: string | null;
  plainLyrics: string | null;
}

export function normalizeText(value: string): string {
  return value.normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

export function matchesTrack(
  record: { artist: string; title: string; duration: number },
  query: LyricsQuery,
): boolean {
  return normalizeText(record.artist) === normalizeText(query.artistName)
    && normalizeText(record.title) === normalizeText(query.trackName)
    && (query.durationSec === null || Math.abs(record.duration - query.durationSec) <= 3);
}
