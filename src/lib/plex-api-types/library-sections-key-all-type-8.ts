export interface Root {
  MediaContainer: MediaContainer;
}

export interface MediaContainer {
  size: number;
  allowSync: boolean;
  art: string;
  content: string;
  identifier: string;
  librarySectionID: number;
  librarySectionTitle: string;
  librarySectionUUID: string;
  mediaTagPrefix: string;
  mediaTagVersion: number;
  nocache: boolean;
  thumb: string;
  title1: string;
  title2: string;
  viewGroup: string;
  Metadata: Metadata[];
}

export interface Metadata {
  ratingKey: string;
  key: string;
  guid: string;
  type: string;
  title: string;
  summary: string;
  index: number;
  viewCount: number;
  skipCount?: number;
  lastViewedAt: number;
  thumb: string;
  art?: string;
  addedAt: number;
  updatedAt: number;
  Image: Image[];
  UltraBlurColors: UltraBlurColors;
  Genre?: Genre[];
  Country?: Country[];
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

export interface Country {
  tag: string;
}
