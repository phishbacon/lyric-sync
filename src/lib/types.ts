import type { Icon as IconType } from "lucide-svelte";
import type { z } from "zod";

import type { insertAlbumSchema, insertArtistSchema, insertLibrarySchema, insertServerSchema, insertTrackSchema, selectAlbumSchema, selectArtistSchema, selectLibrarySchema, selectServerSchema, selectTrackSchema } from "./schema";

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
export type InferredSelectLibrarySchema = z.infer<typeof selectLibrarySchema>;
export interface ServerLoadValues {
  serverConfiguration: InferredSelectServerSchema | undefined;
  libraries: Array<InferredSelectLibrarySchema> | [];
  currentLibrary: InferredSelectLibrarySchema | undefined;
}

// types for select-library
export type InferredInsertLibrarySchema = z.infer<typeof insertLibrarySchema>;

export interface SelectLibraryResponse {
  selected: boolean;
  message: string;
};

// types for artists
export type InferredSelectArtistSchema = z.infer<typeof selectArtistSchema>;
export type InferredInsertArtistSchema = z.infer<typeof insertArtistSchema>;

// types for albums
export type InferredSelectAlbumSchema = z.infer<typeof selectAlbumSchema>;
export type InferredInsertAlbumSchema = z.infer<typeof insertAlbumSchema>;

// types for tracks
export type InferredSelectTrackSchema = z.infer<typeof selectTrackSchema>;
export type InferredInsertTrackSchema = z.infer<typeof insertTrackSchema>;

// types for view-library

export interface LibraryItems {
  returnedArtists: Array<InferredSelectArtistSchema> | undefined;
  returnedAlbums: Array<InferredSelectAlbumSchema> | undefined;
  returnedTracks: Array<InferredSelectTrackSchema> | undefined;
};

export interface ViewLibraryServerLoadValues extends ServerLoadValues, LibraryItems {

};
