import { afterEach, describe, expect, it, vi } from "vitest";

import { getLrcmuxSettings } from "../settings/lrcmux";
import { fetchLyrics } from "./fetch-lyrics";
import { fetchLrcmuxLyrics, LrcmuxUnavailableError } from "./lrcmux";

vi.mock("./lrcmux", () => ({
  fetchLrcmuxLyrics: vi.fn(),
  LrcmuxUnavailableError: class LrcmuxUnavailableError extends Error {},
}));
vi.mock("../settings/lrcmux", () => ({ getLrcmuxSettings: vi.fn() }));

const query = { artistName: "blink-182", trackName: "Feeling This", albumName: null, durationSec: 174 };
const configured = {
  baseUrl: "https://lrcmux.example",
  preferSynced: false,
  enabledSources: ["deezer"] as const,
};

afterEach(() => vi.resetAllMocks());

describe("lyrics routing", () => {
  it("uses only LrcMux with the saved configuration", async () => {
    vi.mocked(getLrcmuxSettings).mockResolvedValue({ ...configured, enabledSources: ["deezer"] });
    vi.mocked(fetchLrcmuxLyrics).mockResolvedValue({
      syncedLyrics: null, plainLyrics: "some lyrics",
    });
    await expect(fetchLyrics(query)).resolves.toMatchObject({ plainLyrics: "some lyrics" });
    expect(fetchLrcmuxLyrics).toHaveBeenCalledWith(query, {
      ...configured, enabledSources: ["deezer"],
    });
  });

  it("preserves no-match and transient failure behavior", async () => {
    vi.mocked(getLrcmuxSettings).mockResolvedValue({ ...configured, enabledSources: ["deezer"] });
    vi.mocked(fetchLrcmuxLyrics).mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new LrcmuxUnavailableError("outage"));
    await expect(fetchLyrics(query)).resolves.toBeNull();
    await expect(fetchLyrics(query)).rejects.toThrow("outage");
  });
});
