import { describe, expect, it } from "vitest";

import { resolveLyricPath } from "./music-path";

const mirror = {
  sourceRoot: "/plex/music",
  mirrorRoot: "/preview/mirror",
};

describe("resolveLyricPath", () => {
  it("preserves the Plex path when no mirror is configured", () => {
    expect(resolveLyricPath("/music/album/song.flac", {})).toBe("/music/album/song.flac");
  });

  it("maps a track into the isolated mirror", () => {
    expect(resolveLyricPath("/plex/music/Band/Song.flac", mirror))
      .toBe("/preview/mirror/Band/Song.flac");
  });

  it("rejects sibling roots, parent traversal, and relative paths", () => {
    for (const path of [
      "/plex/music2/song.flac",
      "/plex/music/../outside.flac",
      "Music/Band/Song.flac",
    ]) {
      expect(() => resolveLyricPath(path, mirror)).toThrow();
    }
  });

  it("rejects partial mirror configuration", () => {
    expect(() => resolveLyricPath("/plex/music/Song.flac", {
      sourceRoot: mirror.sourceRoot,
    })).toThrow();
  });
});
