const PLEX_PRODUCT = "Lyric-Sync";
const PLEX_PIN_ENDPOINT = "https://plex.tv/api/v2/pins";
const PLEX_USER_ENDPOINT = "https://plex.tv/api/v2/user";
const PLEX_AUTH_ENDPOINT = "https://app.plex.tv/auth#";

export interface Pin {
  pinId: number;
  pinCode: string;
}

function plexHeaders(clientIdentifier: string): HeadersInit {
  return {
    "Accept": "application/json",
    "X-Plex-Product": PLEX_PRODUCT,
    "X-Plex-Client-Identifier": clientIdentifier,
  };
}

export async function createPin(clientIdentifier: string): Promise<Pin> {
  const response = await fetch(
    `${PLEX_PIN_ENDPOINT}?X-Plex-Product=${encodeURIComponent(PLEX_PRODUCT)}&X-Plex-Client-Identifier=${encodeURIComponent(clientIdentifier)}&strong=true`,
    {
      method: "POST",
      headers: plexHeaders(clientIdentifier),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to create Plex PIN: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { id: number; code: string };
  return { pinId: data.id, pinCode: data.code };
}

export async function checkPin(
  pin: Pin,
  clientIdentifier: string,
): Promise<string | null> {
  const url = new URL(`${PLEX_PIN_ENDPOINT}/${pin.pinId}`);
  url.searchParams.set("code", pin.pinCode);
  url.searchParams.set("X-Plex-Client-Identifier", clientIdentifier);

  const response = await fetch(url, {
    headers: plexHeaders(clientIdentifier),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as { authToken?: string | null };
  return data.authToken ?? null;
}

export async function validateToken(
  token: string,
  clientIdentifier: string,
): Promise<boolean> {
  const url = new URL(PLEX_USER_ENDPOINT);
  url.searchParams.set("X-Plex-Token", token);

  const response = await fetch(url, {
    headers: plexHeaders(clientIdentifier),
  });
  return response.ok;
}

export function buildAuthUrl(clientIdentifier: string, pinCode: string): string {
  const params = new URLSearchParams({
    "clientID": clientIdentifier,
    "code": pinCode,
    "context[device][product]": PLEX_PRODUCT,
  });
  return `${PLEX_AUTH_ENDPOINT}?${params.toString()}`;
}
