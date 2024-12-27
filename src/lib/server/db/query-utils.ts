import type { InferredInsertLibrarySchema } from "$lib/types";

import { libraries } from "$lib/schema";
import { sql, type SQL } from "drizzle-orm";

// create an update many sql statement for use with db.update.set()
// please don't pass an empty array to this function
export function updateAllCurrentLibraryValuesToFalseExceptOne(inputs: Array<InferredInsertLibrarySchema>): { sql: SQL; uuids: Array<string> } {
  const sqlChunks: Array<SQL> = [];
  const ids: Array<string> = [];

  sqlChunks.push(sql`(case`);

  for (const input of inputs) {
    if (input.currentLibrary) {
      sqlChunks.push(sql`when ${libraries.uuid} = ${input.uuid} then true`);
    }
    else {
      sqlChunks.push(sql`when ${libraries.uuid} = ${input.uuid} then false`);
    }
    ids.push(input.uuid);
  }

  sqlChunks.push(sql`end)`);

  const finalSql: SQL = sql.join(sqlChunks, sql.raw(" "));
  return {
    sql: finalSql,
    uuids: ids,
  };
};
