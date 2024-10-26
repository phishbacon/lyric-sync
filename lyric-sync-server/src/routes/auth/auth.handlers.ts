import type { UsersRoute } from "./auth.routes.js";
import type { AppRouteHandler } from "@/lib/types.js";

export const users: AppRouteHandler<UsersRoute> = (c) => {
  return c.json([
    {
      username: "user1",
      pass_hash: "1234567",
    },
    {
      username: "user2",
      pass_hash: "1234563",
    },
  ]);
};