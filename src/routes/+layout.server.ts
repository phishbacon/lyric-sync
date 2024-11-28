import db from "$lib/server/db";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async () => {
  const serverConfiguration = await db.query.servers.findFirst();
  if (!serverConfiguration) {
    return {
      message: "no-server-config",
    };
  }
  return {
    message: "success",
    serverConfiguration,
  };
};
