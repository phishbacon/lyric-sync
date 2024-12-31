export interface Root {
  MediaContainer: MediaContainer;
}

export interface MediaContainer {
  size: number;
  allowSync: boolean;
  art: string;
  grandparentRatingKey: number;
  grandparentThumb: string;
  grandparentTitle: string;
  identifier: string;
  key: string;
  librarySectionID: number;
  librarySectionTitle: string;
  librarySectionUUID: string;
  mediaTagPrefix: string;
  mediaTagVersion: number;
  nocache: boolean;
  parentIndex: number;
  parentTitle: string;
  parentYear: number;
  summary: string;
  thumb: string;
  title1: string;
  title2: string;
  viewGroup: string;
  Metadata: Metadaum[];
}

export interface Metadaum {
  ratingKey: string;
  key: string;
  parentRatingKey: string;
  grandparentRatingKey: string;
  guid: string;
  parentGuid: string;
  grandparentGuid: string;
  parentStudio: string;
  type: string;
  title: string;
  grandparentKey: string;
  parentKey: string;
  grandparentTitle: string;
  parentTitle: string;
  summary: string;
  index: number;
  parentIndex: number;
  ratingCount: number;
  viewCount: number;
  skipCount?: number;
  lastViewedAt: number;
  parentYear: number;
  thumb: string;
  art: string;
  parentThumb: string;
  grandparentThumb: string;
  grandparentArt: string;
  duration: number;
  addedAt: number;
  updatedAt: number;
  musicAnalysisVersion: string;
  Media: Medum[];
  Image: Image[];
}

export interface Medum {
  id: number;
  duration: number;
  bitrate: number;
  audioChannels: number;
  audioCodec: string;
  container: string;
  hasVoiceActivity: boolean;
  Part: Part[];
}

export interface Part {
  id: number;
  key: string;
  duration: number;
  file: string;
  size: number;
  container: string;
  hasThumbnail: string;
}

export interface Image {
  alt: string;
  type: string;
  url: string;
}
