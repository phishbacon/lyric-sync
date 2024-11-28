import type { Icon as IconType } from "lucide-svelte";
import type { z } from "zod";

import type { insertServerSchema } from "./schema";

export type ServerConfigFormState = z.infer<typeof insertServerSchema>;
export type ServerConfigValidationErrors = Partial<Record<keyof ServerConfigFormState, string[]>>;
export type ServerConfigInputState = Record<keyof ServerConfigFormState, boolean>;
export interface GoodOrBadInput {
  class?: string;
  icon?: typeof IconType;
  title?: string;
};
