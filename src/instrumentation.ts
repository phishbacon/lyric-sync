// Next evaluates instrumentation in both the Edge and Node runtimes.
// Only the Node variant may import server modules, so runtime-check first.
// eslint-disable-next-line node/prefer-global/process
export async function register(): Promise<void> {
  // eslint-disable-next-line node/prefer-global/process
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { db } = await import("@/lib/server/db");
  const { logger } = await import("@/lib/logger");

  await migrate(db, { migrationsFolder: "./src/lib/server/db/migrations" });
  logger.info("Database migrations applied");
}
