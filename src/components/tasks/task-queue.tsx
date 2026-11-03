"use client";

import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Clock3,
  ListTodo, LoaderCircle, RotateCcw, Trash2, X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";

import type { TaskStatus } from "@/lib/server/jobs/task-status";
import type { DismissedTask, TaskChild, TaskSummary } from "@/lib/server/jobs/task-store";

const PAGE_SIZE = 40;
const CHILD_PAGE_SIZE = 100;

type TaskSnapshot = { tasks: TaskSummary[]; hasMore: boolean; activeCount: number; completedCount: number };
type ChildSnapshot = { tasks: TaskChild[]; hasMore: boolean };
type Toast = { message: string; undo?: DismissedTask[] };

function StatusIcon({ status, size = 18 }: { status: TaskStatus; size?: number }) {
  if (status === "running") return <LoaderCircle size={size} className="shrink-0 animate-spin text-accent" aria-label="Running" />;
  if (status === "done") return <CheckCircle2 size={size} className="shrink-0 text-emerald-400" aria-label="Completed" />;
  if (status === "failed") return <AlertCircle size={size} className="shrink-0 text-red-400" aria-label="Failed" />;
  return <Clock3 size={size} className="shrink-0 text-muted" aria-label="Queued" />;
}

async function sendCommand(command: unknown): Promise<Record<string, unknown>> {
  const response = await fetch("/api/tasks", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!response.ok) throw new Error("Could not update task. Please try again.");
  return await response.json() as Record<string, unknown>;
}

export function TaskQueue() {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<TaskSnapshot>({ tasks: [], hasMore: false, activeCount: 0, completedCount: 0 });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expanded, setExpanded] = useState<Record<number, number>>({});
  const [children, setChildren] = useState<Record<number, ChildSnapshot>>({});
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [loading, setLoading] = useState(true);
  const lastStates = useRef<Map<string, TaskStatus> | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/tasks?limit=${visibleCount}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load tasks");
      const data = await response.json() as TaskSnapshot;
      const current = new Map(data.tasks.map(task => [`${task.type}:${task.id}`, task.status]));
      if (lastStates.current) {
        for (const task of data.tasks) {
          const before = lastStates.current.get(`${task.type}:${task.id}`);
          if (!before || (before !== "queued" && before !== "running")) continue;
          if (task.type === "batch" || task.kind === "plex_fetch") {
            if (task.status === "done") setToast({ message: `${task.title} completed` });
            if (task.status === "failed") setToast({ message: `${task.title} finished with errors` });
          }
        }
      }
      lastStates.current = current;
      setSnapshot(data);
      setLoading(false);
      await Promise.all(Object.entries(expanded).map(async ([id, count]) => {
        const response = await fetch(`/api/tasks?batchId=${id}&limit=${count}`, { cache: "no-store" });
        if (response.ok) {
          const detail = await response.json() as ChildSnapshot;
          setChildren(previous => ({ ...previous, [Number(id)]: detail }));
        }
      }));
    } catch {
      setLoading(false);
    }
  }, [expanded, visibleCount]);

  useEffect(() => {
    void load();
    const source = new EventSource("/api/sync/events");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void load(), 250);
    };
    source.addEventListener("message", onChange);
    source.addEventListener("tasks", onChange);
    // Reconcile history after a lost SSE connection or a sleeping browser tab.
    const interval = setInterval(() => void load(), 15000);
    return () => {
      source.close();
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function mutate(command: unknown, onSuccess?: (result: Record<string, unknown>) => void) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await sendCommand(command);
      onSuccess?.(result);
      await load();
    } catch (cause) {
      setToast({ message: cause instanceof Error ? cause.message : "Task update failed" });
    } finally {
      setBusy(false);
    }
  }

  function dismiss(task: DismissedTask) {
    void mutate({ action: "dismiss", task }, () => {
      setToast({ message: "Completed task dismissed", undo: [task] });
    });
  }

  function clearAll() {
    void mutate({ action: "clearCompleted" }, result => {
      const dismissed = result.dismissed as DismissedTask[];
      if (dismissed.length) setToast({ message: `${dismissed.length} completed tasks cleared`, undo: dismissed });
    });
  }

  function retry(task: DismissedTask) {
    void mutate({ action: "retry", task });
  }

  function onTouchEnd(event: TouchEvent, task: DismissedTask, status: TaskStatus) {
    if (!touchStart.current || status !== "done") return;
    const start = touchStart.current;
    touchStart.current = null;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (dx < -70 && Math.abs(dy) < 55) dismiss(task);
  }

  const hasRunning = snapshot.tasks.some(task => task.status === "running");

  return (
    <div className="relative">
      <button type="button" aria-label={`Tasks (${snapshot.activeCount} active)`}
        aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(previous => !previous)}
        className="relative flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted hover:bg-surface-raised hover:text-foreground">
        <ListTodo size={19} className={hasRunning ? "animate-pulse text-accent" : ""} />
        <span className="hidden sm:inline">Tasks</span>
        {snapshot.activeCount > 0 && (
          <span className="min-w-5 rounded-full bg-accent px-1.5 text-center text-xs font-semibold text-black">
            {snapshot.activeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button type="button" aria-label="Close tasks" onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 md:bg-transparent" />
          <section role="dialog" aria-label="Task queue"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl border border-border bg-surface shadow-2xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-9 md:w-[420px] md:max-w-[calc(100vw-2rem)] md:rounded-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="font-semibold">Task queue</h2>
                <p className="text-xs text-muted">{snapshot.activeCount} active · Live updates</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" disabled={busy || snapshot.completedCount === 0}
                  onClick={clearAll} title="Clear completed tasks"
                  className="flex items-center gap-1 text-xs text-muted hover:text-foreground disabled:opacity-40">
                  <Trash2 size={15} /> Clear All
                </button>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close panel"
                  className="rounded p-1 text-muted hover:text-foreground"><X size={19} /></button>
              </div>
            </div>
            <div className="min-h-24 overflow-y-auto overscroll-contain p-3" aria-live="polite">
              {loading && <p className="p-4 text-center text-sm text-muted">Loading tasks…</p>}
              {!loading && snapshot.tasks.length === 0 && (
                <p className="p-6 text-center text-sm text-muted">No tasks yet. Sync lyrics or import a library to get started.</p>
              )}
              <div className="space-y-2">
                {snapshot.tasks.map(task => {
                  const key = `${task.type}:${task.id}`;
                  const id = { type: task.type, id: task.id };
                  const expandedCount = expanded[task.id];
                  const detail = children[task.id];
                  const total = task.counts
                    ? Object.values(task.counts).reduce((sum, count) => sum + count, 0)
                    : 0;
                  return (
                    <article key={key}
                      onTouchStart={event => {
                        touchStart.current = {
                          x: event.touches[0].clientX, y: event.touches[0].clientY,
                        };
                      }}
                      onTouchEnd={event => onTouchEnd(event, id, task.status)}
                      className="touch-pan-y rounded-lg border border-border bg-surface-raised p-3">
                      <div className="flex items-start gap-2">
                        <span className="pt-0.5"><StatusIcon status={task.status} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium" title={task.title}>{task.title}</p>
                          <div className="mt-0.5 flex gap-2 text-xs capitalize text-muted">
                            <span>{task.status === "done" ? "Completed" : task.status}</span>
                            {task.counts && <span>{task.counts.done}/{total} finished
                              {task.counts.failed > 0 ? ` · ${task.counts.failed} failed` : ""}
                            </span>}
                          </div>
                          {task.error && <p className="mt-1 break-words text-xs text-red-300">{task.error}</p>}
                          {task.counts && total > 0 && (
                            <div role="progressbar" aria-valuemin={0} aria-valuemax={total}
                              aria-valuenow={task.counts.done + task.counts.failed}
                              aria-label={`${task.title} progress`}
                              className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                              <div className="h-full bg-accent transition-all" style={{
                                width: `${100 * (task.counts.done + task.counts.failed) / total}%`,
                              }} />
                            </div>
                          )}
                        </div>
                        {task.status === "done" && (
                          <button type="button" disabled={busy} onClick={() => dismiss(id)}
                            aria-label={`Dismiss ${task.title}`} title="Dismiss completed task"
                            className="rounded p-1 text-muted hover:text-foreground disabled:opacity-40">
                            <X size={16} />
                          </button>
                        )}
                        {task.status === "failed" && (
                          <button type="button" disabled={busy} onClick={() => retry(id)}
                            aria-label={`Retry failed ${task.title}`} title="Retry failed"
                            className="rounded p-1 text-accent hover:text-foreground disabled:opacity-40">
                            <RotateCcw size={16} />
                          </button>
                        )}
                        {task.type === "batch" && (
                          <button type="button" onClick={() => setExpanded(previous => {
                            const next = { ...previous };
                            if (next[task.id]) delete next[task.id];
                            else next[task.id] = CHILD_PAGE_SIZE;
                            return next;
                          })} aria-expanded={Boolean(expandedCount)}
                          aria-label={`${expandedCount ? "Collapse" : "Expand"} ${task.title}`}
                          className="rounded p-1 text-muted hover:text-foreground">
                            {expandedCount ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                          </button>
                        )}
                      </div>
                      {expandedCount && task.type === "batch" && (
                        <div className="mt-3 space-y-1 border-t border-border pt-2">
                          {!detail && <p className="text-xs text-muted">Loading tracks…</p>}
                          {detail?.tasks.map(child => (
                            <div key={child.id} className="flex items-center gap-2 py-1 pl-1 text-xs">
                              <StatusIcon status={child.status} size={14} />
                              <span className="min-w-0 flex-1 truncate" title={child.title}>{child.title}</span>
                              {child.status === "failed" && (
                                <button type="button" disabled={busy} title={child.error ?? "Retry failed track"}
                                  aria-label={`Retry ${child.title}`} onClick={() => retry({ type: "job", id: child.id })}
                                  className="shrink-0 text-accent disabled:opacity-40"><RotateCcw size={14} /></button>
                              )}
                            </div>
                          ))}
                          {detail?.hasMore && expandedCount < 5000 && (
                            <button type="button" className="p-1 text-xs text-accent"
                              onClick={() => setExpanded(previous => ({ ...previous, [task.id]: expandedCount + CHILD_PAGE_SIZE }))}>
                              Show more tracks
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
              {snapshot.hasMore && visibleCount < 2000 && (
                <button type="button" onClick={() => setVisibleCount(count => count + PAGE_SIZE)}
                  className="mt-3 w-full rounded-md p-2 text-sm text-accent hover:bg-surface-raised">
                  Show older tasks
                </button>
              )}
            </div>
          </section>
        </>
      )}

      {toast && (
        <div role="status" className="fixed bottom-4 left-1/2 z-[60] flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm shadow-2xl">
          <span>{toast.message}</span>
          {toast.undo && <button type="button" onClick={() => {
            const tasks = toast.undo;
            setToast(null);
            void mutate({ action: "restore", tasks });
          }} className="font-semibold text-accent">Undo</button>}
          <button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={15} /></button>
        </div>
      )}
    </div>
  );
}
