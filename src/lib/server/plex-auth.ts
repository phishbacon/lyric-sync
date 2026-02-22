import { PLEX_AUTH_ENDPOINT, PLEX_PIN_ENDPOINT, PLEX_PRODUCT, PLEX_USER_ENDPOINT } from "$lib/external-links";
import { logger } from "$lib/logger";

export interface PlexPinResponse {
  pinId: number;
  pinCode: string;
}

/**
 * Creates a PIN code on the Plex API for the OAuth flow.
 * POST https://plex.tv/api/v2/pins
 */
export async function createPin(clientId: string): Promise<PlexPinResponse> {
  const params = new URLSearchParams({
    "X-Plex-Product": PLEX_PRODUCT,
    "X-Plex-Client-Identifier": clientId,
    "strong": "true",
  });

  const response = await fetch(`${PLEX_PIN_ENDPOINT}?${params.toString()}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    logger.error(`Failed to create Plex PIN: ${response.status} ${response.statusText}`);
    throw new Error(`Failed to create Plex PIN: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return {
    pinId: data.id,
    pinCode: data.code,
  };
}

/**
 * Checks the status of a PIN to see if the user has authenticated.
 * GET https://plex.tv/api/v2/pins/{pinId}
 * Returns the auth token if the user has authenticated, null otherwise.
 */
export async function checkPin(pinId: number, pinCode: string, clientId: string): Promise<string | null> {
  const params = new URLSearchParams({
    "code": pinCode,
    "X-Plex-Client-Identifier": clientId,
  });

  const response = await fetch(`${PLEX_PIN_ENDPOINT}/${pinId}?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    logger.error(`Failed to check Plex PIN: ${response.status} ${response.statusText}`);
    return null;
  }

  const data = await response.json();

  return data.authToken || null;
}

/**
 * Validates an existing Plex auth token by calling the user endpoint.
 * GET https://plex.tv/api/v2/user
 * Returns true if the token is valid (HTTP 200), false otherwise.
 */
export async function validateToken(token: string, clientId: string): Promise<boolean> {
  const params = new URLSearchParams({
    "X-Plex-Product": PLEX_PRODUCT,
    "X-Plex-Client-Identifier": clientId,
    "X-Plex-Token": token,
  });

  try {
    const response = await fetch(`${PLEX_USER_ENDPOINT}?${params.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    return response.status === 200;
  }
  catch (error) {
    logger.error(`Failed to validate Plex token: ${error}`);
    return false;
  }
}

/**
 * Builds the Plex OAuth authorization URL that the user visits in their browser.
 * Returns a URL like: https://app.plex.tv/auth#?clientID=...&code=...&context[device][product]=Lyric-Sync&forwardUrl=
 */
export function buildAuthUrl(clientId: string, pinCode: string): string {
  const params = new URLSearchParams({
    "clientID": clientId,
    "code": pinCode,
    "context[device][product]": PLEX_PRODUCT,
    "forwardUrl": "",
  });

  return `${PLEX_AUTH_ENDPOINT}?${params.toString()}`;
}
