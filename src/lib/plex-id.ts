export function encodePlexId(id: string): string {
  if (id === "") {
    return "";
  }
  return btoa(id).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function decodePlexId(encoded: string): string {
  if (encoded === "") {
    return "";
  }
  const b64 = encoded.replaceAll("-", "+").replaceAll("_", "/");
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
  try {
    return atob(padded);
  }
  catch {
    throw new Error("Invalid Plex ID");
  }
}
