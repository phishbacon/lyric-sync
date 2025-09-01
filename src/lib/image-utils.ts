import type { ImageConfig } from "$lib/types";

import { RandomImageURL } from "$lib/external-links";

export function getImageSrc(config: ImageConfig): string {
  if (config.image === "no-plex") {
    return RandomImageURL;
  }

  if (config.image) {
    return config.baseURL + config.image + config.plexAuthToken;
  }

  return "/unknown.jpg";
}
