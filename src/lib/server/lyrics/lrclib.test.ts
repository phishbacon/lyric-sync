import { describe, expect, it } from "vitest";

import {
  type LyricsRecord,
  normalizeText,
  pickBestMatch,
} from "./lrclib";

function record(overrides: Partial<LyricsRecord>): LyricsRecord {
  return {
    trackName: "Feeling This",
    artistName: "blink-182",
    albumName: "blink-182",
    duration: 174,
    instrumental: false,
    plainLyrics: "plain text",
    syncedLyrics: "[00:01.00] synced",
    ...overrides,
  };
}

const query = {
  artistName: "blink-182",
  trackName: "Feeling This",
  albumName: "blink-182",
  durationSec: 174,
};

describe("normalizeText", () => {
  it("is case- and punctuation-insensitive", () => {
    expect(normalizeText("Blink‐182")).toBe(normalizeText("blink-182"));
    expect(normalizeText("blink 182")).toBe(normalizeText("blink-182"));
  });

  it("strips diacritics", () => {
    expect(normalizeText("Beyoncé")).toBe("beyonce");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeText("  My   Song  ")).toBe("my song");
  });
});

describe("pickBestMatch", () => {
  it("accepts an exact-normalized match within the duration gate", () => {
    expect(pickBestMatch([record({})], query)).not.toBeNull();
  });

  it("accepts artist/title variants that normalize identically", () => {
    const candidate = record({
      artistName: "Blink 182",
      trackName: "FEELING THIS",
      albumName: "Blink-182",
    });
    expect(pickBestMatch([candidate], query)).toBe(candidate);
  });

  it("rejects a different artist even with matching title", () => {
    const candidate = record({ artistName: "blink-183" });
    expect(pickBestMatch([candidate], query)).toBeNull();
  });

  it("rejects a different title", () => {
    const candidate = record({ trackName: "I Miss You" });
    expect(pickBestMatch([candidate], query)).toBeNull();
  });

  it("rejects a duration more than 3s off", () => {
    const candidate = record({ duration: 178 });
    expect(pickBestMatch([candidate], query)).toBeNull();
  });

  it("accepts a duration within 3s", () => {
    const candidate = record({ duration: 171 });
    expect(pickBestMatch([candidate], query)).toBe(candidate);
  });

  it("skips the duration gate when the track has no known duration", () => {
    const noDuration = { ...query, durationSec: null };
    const candidate = record({ duration: 999 });
    expect(pickBestMatch([candidate], noDuration)).toBe(candidate);
  });

  it("rejects records with no lyric content", () => {
    const candidate = record({ plainLyrics: "", syncedLyrics: null });
    expect(pickBestMatch([candidate], query)).toBeNull();
  });

  it("rejects instrumentals", () => {
    const candidate = record({ instrumental: true });
    expect(pickBestMatch([candidate], query)).toBeNull();
  });

  it("picks the first acceptable candidate in rank order", () => {
    const wrong = record({ artistName: "someone else" });
    const right = record({});
    expect(pickBestMatch([wrong, right], query)).toBe(right);
  });

  it("matches on plain lyrics alone", () => {
    const candidate = record({ syncedLyrics: null, plainLyrics: "words" });
    expect(pickBestMatch([candidate], query)).toBe(candidate);
  });
});
