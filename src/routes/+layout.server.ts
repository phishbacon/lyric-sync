import type { ServerLoadDefaultValues } from "$lib/types";

import { libraries } from "$lib/schema";
import db from "$lib/server/db";
import { eq } from "drizzle-orm";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async () => {
  const defaultValues: ServerLoadDefaultValues = {
    serverConfiguration: undefined,
    currentLibary: undefined,
  };

  const serverConfiguration = await db.query.servers.findFirst();

  if (serverConfiguration) {
    defaultValues.serverConfiguration = serverConfiguration;
    const currentLibary = await db.query.libraries.findFirst({
      where: eq(libraries.currentLibrary, true),
    });

    if (currentLibary) {
      defaultValues.currentLibary = currentLibary;
    }
  }

  return defaultValues;
};
