import type { RequestHandler } from "@sveltejs/kit";
import type { AddServerFormValues, InferredSelectServerSchema } from "$lib/types";
import type { ZodFlattenedError, ZodSafeParseResult } from "zod";

import { insertServerSchema, servers } from "$lib/schema";
import db from "$lib/server/db";
import noPlexServer from "$lib/server/db/no-plex-seed/server";
import env from "$lib/server/env";

export const POST: RequestHandler = async ({ request }) => {
  const serverConfigurations: Array<InferredSelectServerSchema> = await db.query.servers.findMany();

  if (serverConfigurations.length > 0) {
    return new Response(JSON.stringify({
      message: "Server configuration limit reached. One server configuration allowed per instance (for now)",
      status: 400,
    }));
  }

  // Might as well validate everything again
  const serverConfig: AddServerFormValues = env.NO_PLEX ? noPlexServer : await request.json();
  const validate: ZodSafeParseResult<AddServerFormValues> = insertServerSchema.safeParse(serverConfig);
  const errors: ZodFlattenedError<AddServerFormValues>["fieldErrors"] | undefined = validate.success ? undefined : validate.error.flatten().fieldErrors;

  if (errors) {
    return new Response(JSON.stringify({
      message: errors,
      status: 422,
    }));
  }

  const [inserted] = await db.insert(servers).values(serverConfig).returning();
  return new Response(JSON.stringify({
    message: inserted,
    status: 200,
  }));
};
