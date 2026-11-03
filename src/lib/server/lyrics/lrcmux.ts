import { z } from "zod";

import type { LrcmuxSettings, SourceId } from "@/lib/server/settings/lrcmux";

import { matchesTrack, type LyricsQuery, type LyricsRecord } from "@/lib/server/lyrics/matching";

const MAX_ATTEMPTS = 2;
const REQUEST_GAP_MS = 1_000;
const REQUEST_TIMEOUT_MS = 15_000;
const SOURCES_TTL_MS = 5 * 60_000;

const sourceSchema = z.array(z.object({ id: z.string(), name: z.string() }));
const lyricsSchema = z.object({
  track: z.object({ artist: z.string(), title: z.string(), duration: z.number() }),
  meta: z.object({
    level: z.enum(["word", "line", "none"]),
    instrumental: z.boolean().optional(),
    source: z.object({ id: z.string() }).optional(),
  }),
  lines: z.array(z.object({ text: z.string() })),
});

export class LrcmuxUnavailableError extends Error {
  constructor(detail: string) {
    super(`LrcMux unavailable: ${detail}`);
    this.name = "LrcmuxUnavailableError";
  }
}

let lastRequestStartedAt = 0;
const cachedSources = new Map<string, { expires: number; sources: string[] }>();

async function politeFetch(url: URL, accept: string): Promise<Response> {
  const waitMs = lastRequestStartedAt + REQUEST_GAP_MS - Date.now();
  if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
  lastRequestStartedAt = Date.now();
  return fetch(url, {
    headers: { Accept: accept },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

/** 404 represents a definitive miss. Invalid responses and outages are retryable. */
async function request(url: URL, accept: string): Promise<Response | null> {
  let failure = "no response";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 1_000));
    try {
      const response = await politeFetch(url, accept);
      if (response.status === 404) return null;
      if (response.ok) return response;
      failure = `HTTP ${response.status}`;
    } catch (cause) {
      failure = `network error: ${String(cause)}`;
    }
  }
  throw new LrcmuxUnavailableError(`${url.pathname}: ${failure}`);
}

/** LrcMux instances may expose different subsets of sources. */
export async function getAvailableSources(baseUrl: string): Promise<string[]> {
  const cached = cachedSources.get(baseUrl);
  if (cached && cached.expires > Date.now()) return [...cached.sources];

  const response = await request(new URL("/sources", baseUrl), "application/json");
  if (response === null) throw new LrcmuxUnavailableError("/sources returned 404");

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new LrcmuxUnavailableError("/sources returned invalid JSON");
  }
  const parsed = sourceSchema.safeParse(body);
  if (!parsed.success) throw new LrcmuxUnavailableError("/sources returned an unexpected response");

  const sources = parsed.data.map(source => source.id);
  cachedSources.set(baseUrl, { expires: Date.now() + SOURCES_TTL_MS, sources });
  return [...sources];
}

function buildUrl(query: LyricsQuery, settings: LrcmuxSettings, sources: SourceId[], format: string): URL {
  const url = new URL("/get", settings.baseUrl);
  url.searchParams.set("artist", query.artistName);
  url.searchParams.set("title", query.trackName);
  if (query.albumName !== null) url.searchParams.set("album", query.albumName);
  if (query.durationSec !== null) url.searchParams.set("duration", String(query.durationSec));
  url.searchParams.set("level", settings.preferSynced ? "word" : "none");
  url.searchParams.set("format", format);
  url.searchParams.set("sources", sources.join(","));
  return url;
}

/** Fetch the best match exclusively through the instance's native LrcMux API. */
export async function fetchLrcmuxLyrics(
  query: LyricsQuery,
  settings: LrcmuxSettings,
): Promise<LyricsRecord | null> {
  const available = new Set(await getAvailableSources(settings.baseUrl));
  const sources = settings.enabledSources.filter(source => available.has(source));
  if (sources.length === 0) {
    throw new LrcmuxUnavailableError("none of the enabled sources are available on this instance");
  }

  const url = buildUrl(query, settings, sources, "json");
  const response = await request(url, "application/json");
  if (response === null) return null;

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new LrcmuxUnavailableError("/get returned invalid JSON");
  }
  const parsed = lyricsSchema.safeParse(body);
  if (!parsed.success) throw new LrcmuxUnavailableError("/get returned an unexpected response");

  const { track, meta, lines } = parsed.data;
  if (!matchesTrack(track, query) || meta.instrumental || lines.length === 0) return null;
  const plainLyrics = lines.map(line => line.text).join("\n").trim();
  if (!plainLyrics) return null;

  if (!settings.preferSynced || meta.level === "none") {
    return { syncedLyrics: null, plainLyrics };
  }

  // Native LrcMux writes timestamped lines (including word timing) in LRC.
  const lrcResponse = await request(buildUrl(query, settings, sources, "lrc"), "text/plain");
  if (lrcResponse === null) throw new LrcmuxUnavailableError("/get lost the synchronized match");
  const lrc = (await lrcResponse.text()).trim();
  const source = lrcResponse.headers.get("X-Source");
  const level = lrcResponse.headers.get("X-Sync-Level");
  if ((meta.source?.id && source !== meta.source.id)
    || (level && level !== meta.level)
    || !/^\[\d{2,}:\d{2}(?:\.\d{1,3})?\]/m.test(lrc)) {
    throw new LrcmuxUnavailableError("inconsistent or untimestamped LRC response");
  }
  return { syncedLyrics: lrc, plainLyrics };
}
