interface MediaArtProps {
  /** Raw Plex-relative path (e.g. `/library/metadata/123/thumb`). */
  src: string | null;
  alt: string;
  variant: "square" | "banner";
  className?: string;
}

/**
 * Artwork tile with a graceful fallback.
 *
 * Plex serves artwork relative to its own address and requires a token, so
 * the path is handed to the local `/api/art` proxy rather than the Plex host
 * directly. Missing art renders a neutral music glyph instead of a broken
 * image — Plex supplies no thumb for many artists.
 */
export function MediaArt({ src, alt, variant, className = "" }: MediaArtProps) {
  const sizing = variant === "square" ? "aspect-square" : "h-48";

  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-surface-raised text-muted ${sizing} ${className}`}
      >
        <span className="text-3xl" aria-hidden="true">♪</span>
      </div>
    );
  }

  return (
    // Plex art is proxied through the local /api/art route rather than a
    // configured remote host, so next/image would need the Plex address
    // allowlisted at build time — a plain img avoids that coupling.
    <img
      src={`/api/art${src}`}
      alt={alt}
      loading="lazy"
      className={`object-cover ${sizing} ${className}`}
    />
  );
}
