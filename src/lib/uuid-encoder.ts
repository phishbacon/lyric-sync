import { logger } from "./logger";

export function encodePlexID(ID: string): string {
  if (!ID) {
    return "";
  }
  logger.debug(`ID before encode: ${ID}`);
  const encoded = btoa(ID)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  logger.debug(`ID after encode: ${encoded}`);
  return encoded;
}

export function decodePlexID(encoded: string): string {
  if (!encoded) {
    return "";
  }
  // 4 - (encoded.length % 4) how many more chars we need to get to length that
  // is multiple of 4
  // last % 4 is for the case that the length is already a multiple of 4
  logger.debug(`ID before decode: ${encoded}`);
  const decoded = atob(
    encoded
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(encoded.length + ((4 - (encoded.length % 4)) % 4), "="),
  );
  logger.debug(`ID after decode: ${decoded}`);
  return decoded;
}
