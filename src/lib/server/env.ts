/* eslint-disable node/no-process-env -- this module IS the env boundary;
   every other module reads validated values from here. */
import { isAbsolute } from "node:path";
import { z } from "zod";

try {
  process.loadEnvFile();
} catch {
  // No .env file present — rely on real environment variables.
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().default("file:lyric-sync.db"),
  LRCMUX_BASE_URL: z.url().default("https://api.lrcmux.dev"),
  LYRIC_SYNC_MUSIC_SOURCE_ROOT: z.string().refine(isAbsolute, "Must be an absolute path").optional(),
  LYRIC_SYNC_MUSIC_MIRROR_ROOT: z.string().refine(isAbsolute, "Must be an absolute path").optional(),
}).refine(
  value => Boolean(value.LYRIC_SYNC_MUSIC_SOURCE_ROOT) === Boolean(value.LYRIC_SYNC_MUSIC_MIRROR_ROOT),
  { message: "Set both LYRIC_SYNC_MUSIC_SOURCE_ROOT and LYRIC_SYNC_MUSIC_MIRROR_ROOT together" },
);

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
