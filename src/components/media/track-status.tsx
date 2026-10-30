import type { TrackRow } from "@/lib/server/db/queries";

const STATUS_LABELS: Record<TrackRow["syncStatus"], string> = {
  pending: "Pending",
  synced: "Synced",
  no_lyrics: "No lyrics found",
  error: "Error",
};

const STATUS_STYLES: Record<TrackRow["syncStatus"], string> = {
  pending: "text-muted",
  synced: "text-accent",
  no_lyrics: "text-muted",
  error: "text-red-400",
};

export function SyncStatusBadge({ status }: { status: TrackRow["syncStatus"] }) {
  return (
    <span className={`text-xs ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
