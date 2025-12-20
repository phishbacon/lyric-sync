import type { ImageConfig } from "$lib/types";

import place_holder from "$lib/assets/place_holder.png";

export function getImageSrc(config: ImageConfig): string {
  if (config.image === "replace-with-default-asset") {
    return place_holder;
  }
  if (config.image) {
    return config.baseURL + config.image + config.plexAuthToken;
  }

  return place_holder;
}
