import { afterEach, describe, expect, it, vi } from "vitest";

import type { LrcmuxSettings } from "../settings/lrcmux";

import { fetchLrcmuxLyrics, getAvailableSources, LrcmuxUnavailableError } from "./lrcmux";

const query = {
  artistName: "blink-182",
  trackName: "Feeling This",
  albumName: "blink-182",
  durationSec: 174,
};
const settings = (suffix: string, preferSynced = false): LrcmuxSettings => ({
  baseUrl: `https://mux-${suffix}.test`,
  enabledSources: ["deezer", "lrclib", "kugou"],
  preferSynced,
});
const sources = () => Response.json([
  { id: "deezer", name: "Deezer" }, { id: "kugou", name: "KuGou" },
]);
const lyrics = (changes: Record<string, unknown> = {}) => Response.json({
  track: { artist: "blink-182", title: "Feeling This", duration: 173 },
  meta: { level: "none", source: { id: "deezer" } },
  lines: [{ text: "the first line" }, { text: "the second line" }],
  ...changes,
});
const timed = () => lyrics({ meta: { level: "word", source: { id: "deezer" } } });
const lrc = (value = "[00:09.11]<00:09.11>the first line") => new Response(value, {
  headers: { "X-Source": "deezer", "X-Sync-Level": "word" },
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("native LrcMux client", () => {
  it("filters unavailable instance sources and requests plain lyrics by default", async () => {
    const request = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(sources())
      .mockResolvedValueOnce(lyrics());
    await expect(fetchLrcmuxLyrics(query, settings("plain"))).resolves.toEqual({
      syncedLyrics: null,
      plainLyrics: "the first line\nthe second line",
    });
    expect(new URL(String(request.mock.calls[0][0])).pathname).toBe("/sources");
    const url = new URL(String(request.mock.calls[1][0]));
    expect(url.pathname).toBe("/get");
    expect(url.searchParams.get("artist")).toBe(query.artistName);
    expect(url.searchParams.get("title")).toBe(query.trackName);
    expect(url.searchParams.get("duration")).toBe("174");
    expect(url.searchParams.get("sources")).toBe("deezer,kugou");
    expect(url.searchParams.get("level")).toBe("none");
    expect(url.searchParams.get("format")).toBe("json");
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("saves native synchronized LRC when opted in", async () => {
    const request = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(sources())
      .mockResolvedValueOnce(timed())
      .mockResolvedValueOnce(lrc());
    const result = await fetchLrcmuxLyrics(query, settings("synced", true));
    expect(result?.syncedLyrics).toContain("<00:09.11>");
    expect(new URL(String(request.mock.calls[1][0])).searchParams.get("level")).toBe("word");
    expect(new URL(String(request.mock.calls[2][0])).searchParams.get("format")).toBe("lrc");
  });

  it("falls back to plain text if LrcMux only has untimed lines", async () => {
    const request = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(sources())
      .mockResolvedValueOnce(lyrics());
    await expect(fetchLrcmuxLyrics(query, settings("fallback", true)))
      .resolves.toMatchObject({ syncedLyrics: null, plainLyrics: "the first line\nthe second line" });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("accepts only normalized artist/title and a ±3s duration", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(sources()).mockResolvedValueOnce(
      lyrics({ track: { artist: "Blink 182", title: "Feeling This", duration: 178 } }),
    );
    await expect(fetchLrcmuxLyrics(query, settings("wrong-song"))).resolves.toBeNull();
  });

  it("treats a 404 as a definitive missing lyric", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(sources())
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(fetchLrcmuxLyrics(query, settings("missing"))).resolves.toBeNull();
  });

  it("does not send disabled or unavailable sources", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(sources());
    await expect(fetchLrcmuxLyrics(query, {
      ...settings("disabled"), enabledSources: ["lrclib"],
    })).rejects.toBeInstanceOf(LrcmuxUnavailableError);
  });

  it("rejects untimestamped LRC instead of saving it as synchronized", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(sources())
      .mockResolvedValueOnce(timed())
      .mockResolvedValueOnce(lrc("untimed content"));
    await expect(fetchLrcmuxLyrics(query, settings("bad-lrc", true)))
      .rejects.toBeInstanceOf(LrcmuxUnavailableError);
  });

  it("makes 503 failures retryable", async () => {
    vi.useFakeTimers();
    const request = vi.spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 503 }));
    const pending = getAvailableSources("https://mux-unavailable.test");
    const assertion = expect(pending).rejects.toBeInstanceOf(LrcmuxUnavailableError);
    await vi.advanceTimersByTimeAsync(12_000);
    await assertion;
    expect(request).toHaveBeenCalledTimes(2);
  });
});
