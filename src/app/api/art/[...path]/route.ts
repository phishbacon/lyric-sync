import { db } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/**
 * Stream a single artwork image from Plex.
 *
 * The browser cannot fetch Plex art directly: Plex serves it relative to its
 * own address and requires the server token, neither of which belongs in
 * client-side markup. This route is the only place the token meets an image
 * request, so tiles just point here.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const server = await db.query.servers.findFirst();
  if (!server?.baseUrl || !server.xPlexToken) {
    return new Response("Plex server is not configured", { status: 503 });
  }

  // Route segments arrive percent-encoded; decode before rebuilding the path.
  const relativePath = path.map(segment => encodeURIComponent(decodeURIComponent(segment))).join("/");
  let target: URL;
  try {
    target = new URL(`/${relativePath}`, server.baseUrl);
  } catch {
    return new Response("Invalid artwork path", { status: 400 });
  }

  // Refuse to be turned into a proxy for arbitrary hosts.
  if (target.origin !== new URL(server.baseUrl).origin) {
    return new Response("Invalid artwork path", { status: 400 });
  }
  target.searchParams.set("X-Plex-Token", server.xPlexToken);

  let upstream: Response;
  try {
    upstream = await fetch(target, { headers: { Accept: "image/*" } });
  } catch {
    return new Response("Cannot reach Plex server", { status: 502 });
  }

  if (!upstream.ok) {
    return new Response("Artwork not found", { status: upstream.status === 404 ? 404 : 502 });
  }

  const headers = new Headers({
    "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
    // Artwork is immutable per metadata ratingKey; let clients cache it.
    "Cache-Control": "private, max-age=86400",
  });

  return new Response(upstream.body, { status: 200, headers });
}
