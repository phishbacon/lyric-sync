// library/sections plex types
export interface Root {
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
