// Next evaluates instrumentation in both the Edge and Node runtimes.
// Only the Node variant may import server modules, so runtime-check first.
export async function register(): Promise<void> {
  // NEXT_RUNTIME is Next's own framework signal, not app configuration.
  // eslint-disable-next-line node/no-process-env
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { db } = await import("@/lib/server/db");
  const { logger } = await import("@/lib/logger");
  const { startJobWorker } = await import("@/lib/server/jobs/worker");

  await migrate(db, { migrationsFolder: "./src/lib/server/db/migrations" });
  logger.info("Database migrations applied");

  // Detached long-running loop — must not block server startup.
  void startJobWorker();
}
