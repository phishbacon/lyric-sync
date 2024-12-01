import type { RequestHandler } from "@sveltejs/kit";
import type { AddServerFormValues } from "$lib/types";

import { insertServerSchema, servers } from "$lib/schema";
import db from "$lib/server/db";

export const POST: RequestHandler = async ({ request }) => {
  const serverConfigurations = await db.query.servers.findMany();

  if (serverConfigurations.length > 0) {
    return new Response(JSON.stringify({
      message: "Server configuration limit reached. One server configuration allowed per instance (for now)",
      status: 400,
    }));
  }

  // Might as well validate everything again
  const serverConfig: AddServerFormValues = await request.json();
  const validate = insertServerSchema.safeParse(serverConfig);
  const errors = validate.success ? null : validate.error.flatten().fieldErrors;

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
