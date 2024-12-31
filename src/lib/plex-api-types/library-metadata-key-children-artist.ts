export interface Root {
  MediaContainer: MediaContainer;
}

export interface MediaContainer {
  size: number;
  allowSync: boolean;
  art: string;
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
  summary: string;
  thumb: string;
  title1: string;
  title2: string;
  viewGroup: string;
  Metadata: Metadata[];
}

export interface Metadata {
  ratingKey: string;
  key: string;
  parentRatingKey: string;
  guid: string;
  parentGuid: string;
  studio: string;
  type: string;
  title: string;
  parentKey: string;
  parentTitle: string;
  summary: string;
  index: number;
  rating: number;
  viewCount: number;
  skipCount: number;
  lastViewedAt: number;
  year: number;
  thumb: string;
  art: string;
  parentThumb: string;
  originallyAvailableAt: string;
  addedAt: number;
  updatedAt: number;
  loudnessAnalysisVersion: string;
  musicAnalysisVersion: string;
  Image: Image[];
  UltraBlurColors: UltraBlurColors;
  Genre: Genre[];
  titleSort?: string;
}

export interface Image {
  alt: string;
  type: string;
  url: string;
}

export interface UltraBlurColors {
  topLeft: string;
  topRight: string;
  bottomRight: string;
  bottomLeft: string;
}

export interface Genre {
  tag: string;
}
