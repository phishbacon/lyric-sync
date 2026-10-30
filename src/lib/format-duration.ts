/** Formats a duration in milliseconds as m:ss, or a dash when unknown. */
export function formatDuration(duration: number | null): string {
  if (!duration) {
    return "—";
  }
  const totalSeconds = Math.round(duration / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
