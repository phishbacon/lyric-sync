import { and, desc, eq, exists, inArray, isNull, ne, notExists, sql } from "drizzle-orm";

import { db } from "@/lib/server/db";
import { jobs, libraries, taskBatches, tracks } from "@/lib/server/db/schema";
import { emitJobEvent, emitTaskChange } from "@/lib/server/jobs/events";
import { batchStatus, statusRank, type TaskCounts, type TaskStatus } from "@/lib/server/jobs/task-status";

export interface TaskSummary {
  id: number;
  type: "batch" | "job";
  title: string;
  status: TaskStatus;
  kind: "album" | "artist" | "library" | "sync_track" | "plex_fetch";
  createdAt: number;
  error: string | null;
  counts: TaskCounts | null;
}

export interface TaskChild {
  id: number;
  title: string;
  status: TaskStatus;
  error: string | null;
}

const priority = (status: TaskStatus) => statusRank[status];
const SUM = (status: TaskStatus) => sql<number>`sum(case when ${jobs.status} = ${status} then 1 else 0 end)`;
const batchSort = sql`case when ${SUM("running")} > 0 then 0
  when ${SUM("queued")} > 0 then 1
  when ${SUM("failed")} > 0 then 2 else 3 end`;
const jobSort = sql`case when ${jobs.status} = 'running' then 0
  when ${jobs.status} = 'queued' then 1
  when ${jobs.status} = 'failed' then 2 else 3 end`;

/** Load a small window of top-level tasks, with groups counted in SQL. */
export async function listTasks(offset = 0, limit = 50): Promise<{
  tasks: TaskSummary[];
  hasMore: boolean;
  activeCount: number;
  completedCount: number;
}> {
  const fetchCount = offset + limit + 1;
  const [groupRows, singleRows] = await Promise.all([
    db.select({
      id: taskBatches.id,
      scope: taskBatches.scope,
      title: taskBatches.title,
      createdAt: taskBatches.createdAt,
      queued: SUM("queued"),
      running: SUM("running"),
      failed: SUM("failed"),
      done: SUM("done"),
    }).from(taskBatches).leftJoin(jobs, eq(jobs.batchId, taskBatches.id))
      .where(isNull(taskBatches.dismissedAt))
      .groupBy(taskBatches.id).orderBy(batchSort, desc(taskBatches.id)).limit(fetchCount),
    db.select({
      id: jobs.id,
      kind: jobs.kind,
      status: jobs.status,
      targetUuid: jobs.targetUuid,
      trackTitle: tracks.title,
      libraryTitle: libraries.title,
      createdAt: jobs.createdAt,
      error: jobs.error,
    }).from(jobs)
      .leftJoin(tracks, and(eq(jobs.kind, "sync_track"), eq(jobs.targetUuid, tracks.key)))
      .leftJoin(libraries, and(eq(jobs.kind, "plex_fetch"), eq(jobs.targetUuid, libraries.uuid)))
      .where(and(isNull(jobs.batchId), isNull(jobs.dismissedAt)))
      .orderBy(jobSort, desc(jobs.id)).limit(fetchCount),
  ]);

  const tasks: TaskSummary[] = [
    ...groupRows.map(row => {
      const counts: TaskCounts = {
        queued: Number(row.queued), running: Number(row.running),
        failed: Number(row.failed), done: Number(row.done),
      };
      return {
        id: row.id, type: "batch" as const,
        title: `${row.scope === "album" ? "Album" : row.scope === "artist" ? "Artist" : "Library"}: ${row.title}`,
        kind: row.scope, status: batchStatus(counts), createdAt: row.createdAt.getTime(),
        error: null, counts,
      };
    }),
    ...singleRows.map(row => ({
      id: row.id, type: "job" as const,
      title: row.kind === "plex_fetch"
        ? `Import library: ${row.libraryTitle ?? "Plex library"}`
        : `Sync track: ${row.trackTitle ?? "Track"}`,
      kind: row.kind, status: row.status,
      createdAt: row.createdAt.getTime(), error: row.error, counts: null,
    })),
  ].sort((a, b) => priority(a.status) - priority(b.status) || b.createdAt - a.createdAt || b.id - a.id);

  // Active task count is independent of pagination/history volume.
  const [activeSingles, activeGroups, completedSingles, completedGroups] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(jobs).where(and(
      isNull(jobs.batchId), isNull(jobs.dismissedAt), inArray(jobs.status, ["queued", "running"]),
    )),
    db.select({ id: taskBatches.id }).from(taskBatches)
      .innerJoin(jobs, eq(jobs.batchId, taskBatches.id))
      .where(and(isNull(taskBatches.dismissedAt), inArray(jobs.status, ["queued", "running"])))
      .groupBy(taskBatches.id),
    db.select({ count: sql<number>`count(*)` }).from(jobs).where(and(
      isNull(jobs.batchId), isNull(jobs.dismissedAt), eq(jobs.status, "done"),
    )),
    db.select({ count: sql<number>`count(*)` }).from(taskBatches).where(and(
      isNull(taskBatches.dismissedAt),
      exists(db.select({ id: jobs.id }).from(jobs).where(eq(jobs.batchId, taskBatches.id))),
      notExists(db.select({ id: jobs.id }).from(jobs).where(and(
        eq(jobs.batchId, taskBatches.id), ne(jobs.status, "done"),
      ))),
    )),
  ]);

  return {
    tasks: tasks.slice(offset, offset + limit),
    hasMore: tasks.length > offset + limit,
    activeCount: Number(activeSingles[0]?.count ?? 0) + activeGroups.length,
    completedCount: Number(completedSingles[0]?.count ?? 0) + Number(completedGroups[0]?.count ?? 0),
  };
}

export async function listBatchChildren(batchId: number, offset = 0, limit = 100): Promise<{
  tasks: TaskChild[];
  hasMore: boolean;
}> {
  const rows = await db.select({
    id: jobs.id, status: jobs.status, error: jobs.error, title: tracks.title,
  }).from(jobs).leftJoin(tracks, eq(tracks.key, jobs.targetUuid))
    .where(eq(jobs.batchId, batchId)).orderBy(jobs.id).limit(limit + 1).offset(offset);
  return {
    tasks: rows.slice(0, limit).map(row => ({
      id: row.id, status: row.status, error: row.error, title: row.title ?? "Track",
    })),
    hasMore: rows.length > limit,
  };
}

export type DismissedTask = { type: "batch" | "job"; id: number };

/** Hide only completed jobs or batches, retaining database history for Undo. */
export async function dismissTask(task: DismissedTask): Promise<boolean> {
  const now = new Date();
  if (task.type === "job") {
    const rows = await db.update(jobs).set({ dismissedAt: now }).where(and(
      eq(jobs.id, task.id), isNull(jobs.batchId), eq(jobs.status, "done"), isNull(jobs.dismissedAt),
    )).returning({ id: jobs.id });
    if (rows.length) emitTaskChange();
    return rows.length > 0;
  }
  const rows = await db.update(taskBatches).set({ dismissedAt: now }).where(and(
    eq(taskBatches.id, task.id), isNull(taskBatches.dismissedAt),
    exists(db.select({ id: jobs.id }).from(jobs).where(eq(jobs.batchId, taskBatches.id))),
    notExists(db.select({ id: jobs.id }).from(jobs).where(and(
      eq(jobs.batchId, taskBatches.id), ne(jobs.status, "done"),
    ))),
  )).returning({ id: taskBatches.id });
  if (rows.length) emitTaskChange();
  return rows.length > 0;
}

export async function clearCompleted(): Promise<DismissedTask[]> {
  const now = new Date();
  const singles = await db.update(jobs).set({ dismissedAt: now }).where(and(
    isNull(jobs.batchId), eq(jobs.status, "done"), isNull(jobs.dismissedAt),
  )).returning({ id: jobs.id });
  const groups = await db.update(taskBatches).set({ dismissedAt: now }).where(and(
    isNull(taskBatches.dismissedAt),
    exists(db.select({ id: jobs.id }).from(jobs).where(eq(jobs.batchId, taskBatches.id))),
    notExists(db.select({ id: jobs.id }).from(jobs).where(and(
      eq(jobs.batchId, taskBatches.id), ne(jobs.status, "done"),
    ))),
  )).returning({ id: taskBatches.id });
  const dismissed: DismissedTask[] = [
    ...singles.map(row => ({ type: "job" as const, id: row.id })),
    ...groups.map(row => ({ type: "batch" as const, id: row.id })),
  ];
  if (dismissed.length) emitTaskChange();
  return dismissed;
}

export async function restoreTasks(items: DismissedTask[]): Promise<void> {
  const jobIds = items.filter(item => item.type === "job").map(item => item.id);
  const groupIds = items.filter(item => item.type === "batch").map(item => item.id);
  if (jobIds.length) await db.update(jobs).set({ dismissedAt: null }).where(and(
    inArray(jobs.id, jobIds), eq(jobs.status, "done"),
  ));
  if (groupIds.length) await db.update(taskBatches).set({ dismissedAt: null }).where(and(
    inArray(taskBatches.id, groupIds),
    notExists(db.select({ id: jobs.id }).from(jobs).where(and(
      eq(jobs.batchId, taskBatches.id), ne(jobs.status, "done"),
    ))),
  ));
  emitTaskChange();
}

/** Reuse failed rows so that retries preserve one history entry. */
export async function retryTask(task: DismissedTask): Promise<number> {
  const condition = task.type === "batch"
    ? eq(jobs.batchId, task.id)
    : eq(jobs.id, task.id);
  const rows = await db.update(jobs).set({
    status: "queued", startedAt: null, finishedAt: null, error: null,
  }).where(and(condition, eq(jobs.status, "failed"), isNull(jobs.dismissedAt)))
    .returning({ id: jobs.id, kind: jobs.kind, targetUuid: jobs.targetUuid });
  for (const row of rows) {
    emitJobEvent({ jobId: row.id, kind: row.kind, status: "queued", targetUuid: row.targetUuid });
  }
  return rows.length;
}
