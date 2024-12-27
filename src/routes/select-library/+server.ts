import type { RequestHandler } from "@sveltejs/kit";
import type { InferredInsertLibrarySchema, SelectLibraryResponse } from "$lib/types";

import { insertLibrarySchema, libraries, selectServerSchema } from "$lib/schema";
import db from "$lib/server/db";
import { updateAllCurrentLibraryValuesToFalseExceptOne } from "$lib/server/db/query-utils";
import { inArray } from "drizzle-orm";
import { z } from "zod";

export const POST: RequestHandler = async ({ request }) => {
  const selectLibraryResponse: SelectLibraryResponse = {
    selected: false,
    message: "Unable to update database with selected library",
  };
  // validate everything
  const requestLibraries: Array<InferredInsertLibrarySchema> = await request.json();
  const validateLibrariesArraySchema = z.array(insertLibrarySchema);
  const validate = validateLibrariesArraySchema.safeParse(requestLibraries);
  const errors = validate.success ? null : validate.error.flatten().fieldErrors;

  if (errors) {
    return new Response(JSON.stringify(selectLibraryResponse));
  }

  const { sql, uuids } = updateAllCurrentLibraryValuesToFalseExceptOne(requestLibraries);

  const updatedLibraries = await db.update(libraries).set({
    currentLibrary: sql,
  }).where(inArray(libraries.uuid, uuids)).returning();

  if (updatedLibraries) {
    selectLibraryResponse.selected = true;
    selectLibraryResponse.message = "Database updated with current selection";
  }

  return new Response(JSON.stringify(selectLibraryResponse));
};
