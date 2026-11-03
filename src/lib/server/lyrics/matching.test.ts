import { describe, expect, it } from "vitest";

import { matchesTrack, normalizeText } from "./matching";

describe("metadata gating", () => {
  it("normalizes diacritics, punctuation, and whitespace", () => {
    expect(normalizeText(" Beyoncé   — LIVE ")).toBe("beyonce live");
    expect(normalizeText("blink‐182")).toBe("blink 182");
  });

  it("checks artist, title and duration independently", () => {
    const query = { artistName: "Blink-182", trackName: "Feeling This", albumName: null, durationSec: 174 };
    expect(matchesTrack({ artist: "BLINK 182", title: "feeling this", duration: 171 }, query)).toBe(true);
    expect(matchesTrack({ artist: "blink-183", title: "Feeling This", duration: 174 }, query)).toBe(false);
    expect(matchesTrack({ artist: "blink-182", title: "Feeling That", duration: 174 }, query)).toBe(false);
    expect(matchesTrack({ artist: "blink-182", title: "Feeling This", duration: 178 }, query)).toBe(false);
    expect(matchesTrack({ artist: "blink-182", title: "Feeling This", duration: 999 }, {
      ...query, durationSec: null,
    })).toBe(true);
  });
});
