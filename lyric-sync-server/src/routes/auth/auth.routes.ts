import { createRoute, z } from "@hono/zod-openapi";
import * as StatusCodes from "@/http-status-codes.js";
import jsonContent from "@/openapi/helpers/json-content.js";

const tags = ["Users"];

export const users = createRoute({
  path: "/auth/users",
  method: "get",
  tags,
  responses: {
    [StatusCodes.OK]: jsonContent(
      z.array(z.object({
        username: z.string(),
        pass_hash: z.string(),
      })),
      "List of all users"
    ),
  },
});

export type UsersRoute = typeof users;