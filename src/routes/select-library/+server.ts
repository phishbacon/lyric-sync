import type { RequestHandler } from "@sveltejs/kit";
import type { InferredInsertLibrarySchema, InferredSelectLibrarySchema, SelectLibraryResponse } from "$lib/types";

import { insertLibrarySchema, libraries } from "$lib/schema";
import db from "$lib/server/db";
import { updateAllCurrentLibraryValuesToFalseExceptOne } from "$lib/server/db/query-utils";
import { inArray } from "drizzle-orm";
import { type SafeParseReturnType, type typeToFlattenedError, z, type ZodArray } from "zod";

export const POST: RequestHandler = async ({ request }) => {
  const selectLibraryResponse: SelectLibraryResponse = {
    selected: false,
    message: "Unable to update database with selected library",
  };
  // validate everything
  const requestLibraries: Array<InferredInsertLibrarySchema> = await request.json();
  const validateLibrariesArraySchema: ZodArray<typeof insertLibrarySchema> = z.array(insertLibrarySchema);
  const validate: SafeParseReturnType<Array<InferredInsertLibrarySchema>, Array<InferredInsertLibrarySchema>> = validateLibrariesArraySchema.safeParse(requestLibraries);
  const errors: typeToFlattenedError<Array<InferredInsertLibrarySchema>>["fieldErrors"] | undefined = validate.success ? undefined : validate.error.flatten().fieldErrors;

  if (errors) {
    return new Response(JSON.stringify(selectLibraryResponse));
  }

  const { sql, uuids } = updateAllCurrentLibraryValuesToFalseExceptOne(requestLibraries);

  const updatedLibraries: Array<InferredSelectLibrarySchema> = await db.update(libraries).set({
    currentLibrary: sql,
  }).where(inArray(libraries.uuid, uuids)).returning();

  if (updatedLibraries) {
    selectLibraryResponse.selected = true;
    selectLibraryResponse.message = "Database updated with current selection";
  }

  return new Response(JSON.stringify(selectLibraryResponse));
};
