import type { Icon as IconType } from "lucide-svelte";
import type { z } from "zod";

import type { insertLibrarySchema, insertServerSchema, selectLibrarySchema, selectServerSchema } from "./schema";

// types for add-server

export type AddServerFormValues = z.infer<typeof insertServerSchema>;
export type AddServerValidationErrors = Partial<Record<keyof AddServerFormValues, string[]>>;
export type AddServerInputFocused = Record<keyof AddServerFormValues, boolean>;
export interface ClassIconAndTitle {
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

// types for test-connection
export interface TestConnectionResponse {
  connection: boolean;
  message: string;
}

// server load default types
export type InferredSelectServerSchema = z.infer<typeof selectServerSchema>;
export type InferredSelectLibarySchema = z.infer<typeof selectLibrarySchema>;
export interface ServerLoadDefaultValues {
  serverConfiguration: InferredSelectServerSchema | undefined;
  libraries: Array<InferredSelectLibarySchema> | [];
  currentLibrary: InferredSelectLibarySchema | undefined;
}

// library/sections plex types
export interface LibrarySectionsResponse {
  MediaContainer: MediaContainer;
}

export interface MediaContainer {
  size: number;
  allowSync: boolean;
  title1: string;
  Directory: Directory[];
}

export interface Directory {
  allowSync: boolean;
  art: string;
  composite: string;
  filters: boolean;
  refreshing: boolean;
  thumb: string;
  key: string;
  type: string;
  title: string;
  agent: string;
  scanner: string;
  language: string;
  uuid: string;
  updatedAt: number;
  createdAt: number;
  scannedAt: number;
  content: boolean;
  directory: boolean;
  contentChangedAt: number;
  hidden: number;
  Location: Location[];
}

export interface Location {
  id: number;
  path: string;
}

// types for select-library
export type InferredInsertLibrarySchema = z.infer<typeof insertLibrarySchema>;

export interface SelectLibraryResponse {
  selected: boolean;
  message: string;
};
