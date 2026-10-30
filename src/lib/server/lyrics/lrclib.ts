import { z } from "zod";

/**
 * lrclib.net client.
 *
 * Two endpoints, tried in order:
 * - `/api/get` — exact artist+album+title+duration lookup; 404 means the
 *   catalogue has nothing for this track.
 * - `/api/search` — free-text; results are gated client-side to normalized
 *   artist+title equality and a ±3s duration match, because search is fuzzy
 *   and wrong lyrics on disk are worse than none.
 *
 * lrclib intermittently answers 503 `ServerOverloaded` (observed live), so
 * every request retries up to MAX_ATTEMPTS with backoff, and all bodies are
 * Zod-validated — a busy-response or truncated body must never reach
 * matching. Durations here are seconds (float); the DB stores Plex
 * milliseconds, converted by the caller.
 */

const LRCLIB_BASE = "https://lrclib.net";
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1_000, 3_000];
/** lrclib's stated courtesy limit: at most one request per second. */
const REQUEST_GAP_MS = 1_000;
const REQUEST_TIMEOUT_MS = 15_000;
const DURATION_TOLERANCE_SEC = 3;

export const lyricsRecordSchema = z.object({
  trackName: z.string(),
  artistName: z.string(),
  albumName: z.string().nullish(),
  duration: z.number().nullish(),
  instrumental: z.boolean().nullish(),
  plainLyrics: z.string().nullish(),
  syncedLyrics: z.string().nullish(),
});

export type LyricsRecord = z.infer<typeof lyricsRecordSchema>;

const searchResponseSchema = z.array(lyricsRecordSchema);

/** lrclib never answered (overloaded/unreachable) after every retry. */
export class LrclibUnavailableError extends Error {
  constructor(detail: string) {
    super(`lrclib unavailable: ${detail}`);
    this.name = "LrclibUnavailableError";
  }
}

export interface LyricsQuery {
  artistName: string;
  trackName: string;
  albumName: string | null;
  /** Null when Plex didn't report a duration — then the duration gate is skipped. */
  durationSec: number | null;
}

/**
 * Comparison key for match gating: lowercase, drop diacritics (NFD), and
 * collapse every non-alphanumeric run to one space so "blink‐182" (unicode
 * hyphen), "blink-182", and "blink 182" all compare equal.
 */
export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function hasLyrics(record: LyricsRecord): boolean {
  return Boolean(record.syncedLyrics?.trim() || record.plainLyrics?.trim());
}

/**
 * Gate `/api/search` results: exact normalized artist+title, duration within
 * ±3 seconds when we have one to compare, and actual lyric content. Returns
 * the first acceptable candidate (lrclib ranks by relevance) or null.
 */
export function pickBestMatch(
  records: LyricsRecord[],
  query: LyricsQuery,
): LyricsRecord | null {
  const artist = normalizeText(query.artistName);
  const title = normalizeText(query.trackName);

  for (const record of records) {
    if (record.instrumental || !hasLyrics(record)) {
      continue;
    }
    if (
      normalizeText(record.artistName) !== artist
      || normalizeText(record.trackName) !== title
    ) {
      continue;
    }
    // Only a duration we hold can veto: with nothing to compare, exact
    // normalized equality already decided.
    if (
      query.durationSec !== null
      && (record.duration === null
        || record.duration === undefined
        || Math.abs(record.duration - query.durationSec) > DURATION_TOLERANCE_SEC)
    ) {
      continue;
    }
    return record;
  }
  return null;
}

/** Timestamp of the last request start — enforces the 1s courtesy gap. */
let lastRequestStartedAt = 0;

async function politeFetch(url: string): Promise<Response> {
  const waitMs = lastRequestStartedAt + REQUEST_GAP_MS - Date.now();
  if (waitMs > 0) {
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }
  lastRequestStartedAt = Date.now();
  return fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

/**
 * Fetch + validate with retry. Resolves with the parsed value, or null when
 * lrclib definitively answered 404. Throws LrclibUnavailableError when every
 * attempt was rejected (5xx, malformed body, network failure) — transient,
 * so the job can be retried later rather than marked "no lyrics".
 */
async function fetchValidated<T>(
  url: string,
  parse: (body: unknown) => T | null,
): Promise<T | null> {
  let lastFailure = "no attempt made";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await new Promise(resolve =>
        setTimeout(resolve, RETRY_DELAYS_MS[attempt - 2]),
      );
    }

    let response: Response;
    try {
      response = await politeFetch(url);
    } catch (cause) {
      lastFailure = `network: ${String(cause)}`;
      continue;
    }

    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      lastFailure = `HTTP ${response.status}`;
      continue;
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      lastFailure = "response was not JSON";
      continue;
    }

    const value = parse(body);
    if (value === null) {
      // Includes the 200-with-busy-object shape seen under overload.
      lastFailure = "response failed validation";
      continue;
    }
    return value;
  }

  throw new LrclibUnavailableError(
    `no valid answer after ${MAX_ATTEMPTS} attempts (${lastFailure})`,
  );
}

function parseRecord(body: unknown): LyricsRecord | null {
  const parsed = lyricsRecordSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

function parseSearchResults(body: unknown): LyricsRecord[] | null {
  const parsed = searchResponseSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

/**
 * Look up lyrics for one track. Returns the matched record, or null when the
 * catalogue definitively has nothing acceptable (→ permanent `no_lyrics`).
 * Throws LrclibUnavailableError on transient failure.
 */
export async function fetchLyrics(query: LyricsQuery): Promise<LyricsRecord | null> {
  const getUrl = new URL(`${LRCLIB_BASE}/api/get`);
  getUrl.searchParams.set("artist_name", query.artistName);
  getUrl.searchParams.set("track_name", query.trackName);
  if (query.albumName !== null) {
    getUrl.searchParams.set("album_name", query.albumName);
  }
  if (query.durationSec !== null) {
    getUrl.searchParams.set("duration", String(query.durationSec));
  }

  const exact = await fetchValidated(getUrl.toString(), parseRecord);
  if (exact !== null && !exact.instrumental && hasLyrics(exact)) {
    return exact;
  }

  const searchUrl = new URL(`${LRCLIB_BASE}/api/search`);
  searchUrl.searchParams.set("q", `${query.artistName} ${query.trackName}`);
  const results = await fetchValidated(searchUrl.toString(), parseSearchResults);
  if (results === null) {
    return null;
  }
  return pickBestMatch(results, query);
}
