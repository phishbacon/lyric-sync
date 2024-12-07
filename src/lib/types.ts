import type { Icon as IconType } from "lucide-svelte";
import type { z } from "zod";

import type { insertServerSchema, selectLibrarySchema, selectServerSchema } from "./schema";

// types for add-server

export type AddServerFormValues = z.infer<typeof insertServerSchema>;
export type AddServerValidationErrors = Partial<Record<keyof AddServerFormValues, string[]>>;
export type AddServerInputFocused = Record<keyof AddServerFormValues, boolean>;
export interface InputClassIconAndTitle {
  class?: string;
  icon?: typeof IconType;
  title?: string;
  color?: string;
};

export interface AddServerButtonsState {
  testButton: {
    class: string;
    disabled: boolean;
  };
  submitButton: {
    disabled: boolean;
  };
}

export interface AddServerFormState {
  formValues: AddServerFormValues;
  inputFocused: AddServerInputFocused;
  formUpdated: boolean;
}

// server load default types
export type inferredSelectServerSchema = z.infer<typeof selectServerSchema>;
export type inferredSelectLibarySchema = z.infer<typeof selectLibrarySchema>;
export interface ServerLoadDefaultValues {
  serverConfiguration: inferredSelectServerSchema | undefined;
  currentLibary: inferredSelectLibarySchema | undefined;
}
