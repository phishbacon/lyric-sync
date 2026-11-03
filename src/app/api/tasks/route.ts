import { z } from "zod";

import {
  clearCompleted,
  dismissTask,
  listBatchChildren,
  listTasks,
  restoreTasks,
  retryTask,
} from "@/lib/server/jobs/task-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const identifier = z.object({
  type: z.enum(["job", "batch"]),
  id: z.number().int().positive(),
});
const commands = z.discriminatedUnion("action", [
  z.object({ action: z.literal("dismiss"), task: identifier }),
  z.object({ action: z.literal("retry"), task: identifier }),
  z.object({ action: z.literal("restore"), tasks: z.array(identifier).max(10000) }),
  z.object({ action: z.literal("clearCompleted") }),
]);

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const offset = z.coerce.number().int().min(0).max(10000).safeParse(params.get("offset") ?? "0");
  if (!offset.success) return Response.json({ error: "Invalid offset" }, { status: 400 });
  const batchId = params.get("batchId");
  const limit = z.coerce.number().int().min(1).max(batchId === null ? 2000 : 5000)
    .safeParse(params.get("limit") ?? (batchId === null ? "50" : "100"));
  if (!limit.success) return Response.json({ error: "Invalid limit" }, { status: 400 });
  if (batchId !== null) {
    const parsed = z.coerce.number().int().positive().safeParse(batchId);
    if (!parsed.success) return Response.json({ error: "Invalid batch" }, { status: 400 });
    return Response.json(await listBatchChildren(parsed.data, offset.data, limit.data));
  }
  return Response.json(await listTasks(offset.data, limit.data));
}

export async function POST(request: Request): Promise<Response> {
  let parsed;
  try {
    parsed = commands.safeParse(await request.json());
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!parsed.success) return Response.json({ error: "Invalid task command" }, { status: 400 });

  const command = parsed.data;
  switch (command.action) {
    case "dismiss": {
      const dismissed = await dismissTask(command.task);
      return Response.json({ dismissed }, { status: dismissed ? 200 : 409 });
    }
    case "clearCompleted":
      return Response.json({ dismissed: await clearCompleted() });
    case "restore":
      await restoreTasks(command.tasks);
      return Response.json({ restored: true });
    case "retry": {
      const queued = await retryTask(command.task);
      return Response.json({ queued }, { status: queued ? 200 : 409 });
    }
  }
}
