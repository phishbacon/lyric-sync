// A local fixture for Plex's JSON API and the native LrcMux API. No external requests.
import { createServer } from "node:http";
import { join } from "node:path";

const musicRoot = join(process.env.LYRIC_SYNC_E2E_ROOT, "music");
const trackPath = join(musicRoot, "Example.flac");
const artistId = "plex://artist/fixture";
const albumId = "plex://album/fixture";

const dataByType = {
  "8": [{ key: "/library/metadata/101", guid: artistId, title: "Fixture Artist" }],
  "9": [{
    key: "/library/metadata/201",
    guid: albumId,
    parentGuid: artistId,
    title: "Fixture Album",
  }],
  "10": [{
    key: "/library/metadata/301",
    guid: "plex://track/fixture",
    parentGuid: albumId,
    grandparentGuid: artistId,
    title: "Example Track",
    duration: 180_000,
    index: 1,
    Media: [{ Part: [{ file: trackPath }] }],
  }],
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  let status = 200;
  let body;

  if (url.pathname === "/health") {
    body = { ok: true };
  } else if (url.pathname === "/") {
    body = { MediaContainer: {} };
  } else if (url.pathname === "/library/sections") {
    body = {
      MediaContainer: {
        Directory: [{
          uuid: "fixture-library",
          key: "1",
          title: "Fixture Library",
          type: "artist",
          Location: [{ path: musicRoot }],
        }],
      },
    };
  } else if (url.pathname === "/library/sections/1/all") {
    const items = dataByType[url.searchParams.get("type")] ?? [];
    body = { MediaContainer: { size: items.length, totalSize: items.length, Metadata: items } };
  } else if (url.pathname === "/sources") {
    body = [{ id: "deezer", name: "Deezer", level: "word" }];
  } else if (url.pathname === "/get") {
    // Make the background fetch observable so the UI test can verify the
    // track spinner persists beyond the server action's quick enqueue.
    await new Promise(resolve => setTimeout(resolve, 1_500));
    if (url.searchParams.get("format") === "lrc") {
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Source": "deezer",
        "X-Sync-Level": "word",
      });
      res.end("[00:01.00]<00:01.00>Fixture lyric line");
      return;
    }
    body = {
      track: {
        title: "Example Track", artist: "Fixture Artist",
        album: "Fixture Album", duration: 180,
      },
      meta: {
        level: url.searchParams.get("level") === "word" ? "word" : "none",
        source: { id: "deezer" },
      },
      lines: [{ text: "Fixture lyric line", start: 1000 }],
    };
  } else {
    status = 404;
    body = { error: "Unknown fixture endpoint" };
  }

  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
});

server.listen(39378, "127.0.0.1");
