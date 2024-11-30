import type { Icon as IconType } from "lucide-svelte";
import type { z } from "zod";

import type { insertServerSchema, updateServerSchema } from "./schema";

// types for add-server

export type ServerConfigFormState = z.infer<typeof insertServerSchema>;
export type ServerConfigValidationErrors = Partial<Record<keyof ServerConfigFormState, string[]>>;
export type ServerConfigInputState = Record<keyof ServerConfigFormState, boolean>;
export interface InputClassIconAndTitle {
  class?: string;
  icon?: typeof IconType;
  title?: string;
};

export interface TestButtonClassAndDisabled {
  class?: string;
  disabled: boolean;
}
