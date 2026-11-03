export type TaskStatus = "queued" | "running" | "failed" | "done";

export interface TaskCounts {
  queued: number;
  running: number;
  failed: number;
  done: number;
}

/** A batch is only finished when every child is finished. */
export function batchStatus(counts: TaskCounts): TaskStatus {
  if (counts.running > 0) return "running";
  if (counts.queued > 0) return "queued";
  if (counts.failed > 0) return "failed";
  return "done";
}

export const statusRank: Record<TaskStatus, number> = {
  running: 0,
  queued: 1,
  failed: 2,
  done: 3,
};
