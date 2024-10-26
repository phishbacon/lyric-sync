import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { users } from "@/db/schema";
import * as StatusCodes from "@/http-status-codes";

import type { GetAllRoute, InsertRoute } from "./auth.routes";

export const getAll: AppRouteHandler<GetAllRoute> = async (c) => {
  const users = await db.query.users.findMany();
  return c.json(users);
};

export const insert: AppRouteHandler<InsertRoute> = async (c) => {
  const user = c.req.valid("json");
  const [inserted] = await db.insert(users).values(user).returning();
  return c.json(inserted, StatusCodes.OK);
};
