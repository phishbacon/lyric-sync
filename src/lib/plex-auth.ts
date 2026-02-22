import type { PlexPollApiResponse } from "$lib/types";

export const AUTH_POLL_INTERVAL_MS = 1000;
export const AUTH_POLL_TIMEOUT_MS = 60000;

export async function pollForToken(pinId: number, pinCode: string, clientId: string): Promise<string | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < AUTH_POLL_TIMEOUT_MS) {
    const params = new URLSearchParams({
      pinId: String(pinId),
      pinCode,
      clientId,
    });

    const response: Response = await fetch(`/api/plex-auth/poll?${params.toString()}`);

    if (response.ok) {
      const data: PlexPollApiResponse = await response.json();
      if (data.authenticated && data.token) {
        return data.token;
      }
    }

    await new Promise(resolve => setTimeout(resolve, AUTH_POLL_INTERVAL_MS));
  }

  return null;
}
