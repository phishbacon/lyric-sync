import { createRouter } from "@/lib/create-app.js";
import * as handlers from "./auth.handlers.js";
import * as routes from "./auth.routes.js";

const router = createRouter()
  .openapi(routes.users, handlers.users);

export default router;