// calling this index because these types correspond to the response from the /
// route when calling the plex api
export interface Root {
  MediaContainer: MediaContainer;
}

export interface MediaContainer {
  size: number;
  allowCameraUpload: boolean;
  allowChannelAccess: boolean;
  allowMediaDeletion: boolean;
  allowSharing: boolean;
  allowSync: boolean;
  allowTuners: boolean;
  apiVersion: string;
  backgroundProcessing: boolean;
  certificate: boolean;
  companionProxy: boolean;
  countryCode: string;
  diagnostics: string;
  eventStream: boolean;
  friendlyName: string;
  hubSearch: boolean;
  itemClusters: boolean;
  livetv: number;
  machineIdentifier: string;
  maxUploadBitrate: number;
  maxUploadBitrateReason: string;
  maxUploadBitrateReasonMessage: string;
  mediaProviders: boolean;
  multiuser: boolean;
  musicAnalysis: number;
  myPlex: boolean;
  myPlexMappingState: string;
  myPlexSigninState: string;
  myPlexSubscription: boolean;
  myPlexUsername: string;
  offlineTranscode: number;
  ownerFeatures: string;
  platform: string;
  platformVersion: string;
  pluginHost: boolean;
  pushNotifications: boolean;
  readOnlyLibraries: boolean;
  streamingBrainABRVersion: number;
  streamingBrainVersion: number;
  sync: boolean;
  transcoderActiveVideoSessions: number;
  transcoderAudio: boolean;
  transcoderLyrics: boolean;
  transcoderPhoto: boolean;
  transcoderSubtitles: boolean;
  transcoderVideo: boolean;
  transcoderVideoBitrates: string;
  transcoderVideoQualities: string;
  transcoderVideoResolutions: string;
  updatedAt: number;
  updater: boolean;
  version: string;
  voiceSearch: boolean;
  Directory: Directory[];
}

export interface Directory {
  count: number;
  key: string;
  title: string;
}
