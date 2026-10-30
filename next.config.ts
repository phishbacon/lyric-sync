import type { NextConfig } from "next";

import { networkInterfaces } from "node:os";

/**
 * Hosts the dev server may be reached from besides localhost.
 *
 * Browsing from another machine uses this machine's LAN address, which Next
 * 16 blocks by default for dev resources (HMR, devtools). The list is derived
 * from the live interfaces so it stays correct when DHCP hands out a new
 * address — a hardcoded IP would silently go stale and only ever manifest as
 * a dead hot-reload. Dev-only; production is unaffected.
 *
 * Entries are bare hostnames (no scheme, no port, no IPv6 brackets): Next
 * parses the request's Origin/Referer and matches on the bare hostname.
 */
function devOrigins(): string[] {
  const hosts = new Set<string>(["localhost"]);
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.internal) {
        continue;
      }
      hosts.add(address.address);
    }
  }
  return [...hosts];
}

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: devOrigins(),
};

export default nextConfig;
