// Next evaluates instrumentation in both the Edge and Node runtimes.
// Only the Node variant may import server modules, so runtime-check first.
export async function register(): Promise<void> {
  // NEXT_RUNTIME is Next's own framework signal, not app configuration.
  // eslint-disable-next-line node/no-process-env
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  // A literal node:path import here is deliberate, not accidental lint
  // debt: Next's file tracer only ships the migration folder into the
  // standalone output (where there is no src/ checkout) when it can follow a
  // static reference to it. Building the path from process.cwd() instead
  // drops the folder from the image and breaks boot. The Edge-runtime warning
  // this import costs is expected — the guard above keeps it out of Edge.
  const { join } = await import("node:path");
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { db } = await import("@/lib/server/db");
  const { logger } = await import("@/lib/logger");
  const { startJobWorker } = await import("@/lib/server/jobs/worker");

  // Next's file tracer follows this literal reference and ships the migration
  // folder (SQL + meta/_journal.json) into the standalone output at the same
  // src/ path, so one CWD-relative location works in dev and in the image.
  await migrate(db, {
    migrationsFolder: join(process.cwd(), "src", "lib", "server", "db", "migrations"),
  });
  logger.info("Database migrations applied");

  // Detached long-running loop — must not block server startup.
  void startJobWorker();
}
