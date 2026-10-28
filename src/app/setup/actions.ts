"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { servers } from "@/lib/server/db/schema";
import { buildAuthUrl, createPin } from "@/lib/server/plex/auth";
import { PlexApiError, testConnection } from "@/lib/server/plex/client";

const serverFormSchema = z.object({
  name: z.string().min(1, "Server name is required"),
  baseUrl: z
    .string()
    .min(1, "Server URL is required")
    .url("Must be a valid URL, e.g. http://192.168.1.10:32400"),
  xPlexToken: z.string().min(1, "Plex authentication is required"),
  clientIdentifier: z.string().min(1),
});

export interface SetupResult {
  success: boolean;
  message: string;
}

export async function startPlexAuth(): Promise<
  | { success: true; authUrl: string; clientIdentifier: string; pinId: number; pinCode: string }
  | { success: false; message: string }
> {
  const clientIdentifier = crypto.randomUUID();
  try {
    const pin = await createPin(clientIdentifier);
    return {
      success: true,
      authUrl: buildAuthUrl(clientIdentifier, pin.pinCode),
      clientIdentifier,
      pinId: pin.pinId,
      pinCode: pin.pinCode,
    };
  }
  catch (cause) {
    return { success: false, message: `Failed to start Plex auth: ${String(cause)}` };
  }
}

export async function testServerConnection(input: {
  baseUrl: string;
  token: string;
  clientIdentifier: string;
}): Promise<SetupResult> {
  try {
    await testConnection({
      baseUrl: input.baseUrl,
      token: input.token,
      clientIdentifier: input.clientIdentifier,
    });
    return { success: true, message: "Connection successful" };
  }
  catch (cause) {
    const message = cause instanceof PlexApiError
      ? cause.message
      : String(cause);
    return { success: false, message };
  }
}

export async function saveServer(formData: FormData): Promise<SetupResult> {
  const parsed = serverFormSchema.safeParse({
    name: formData.get("name"),
    baseUrl: formData.get("baseUrl"),
    xPlexToken: formData.get("xPlexToken"),
    clientIdentifier: formData.get("clientIdentifier"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues.map(issue => issue.message).join("; "),
    };
  }

  const existing = await db.query.servers.findFirst();
  if (existing) {
    return {
      success: false,
      message: "A server is already configured. Use settings to change it.",
    };
  }

  // Final server-side connection check before persisting.
  const connection = await testServerConnection({
    baseUrl: parsed.data.baseUrl,
    token: parsed.data.xPlexToken,
    clientIdentifier: parsed.data.clientIdentifier,
  });
  if (!connection.success) {
    return connection;
  }

  await db.insert(servers).values({
    name: parsed.data.name,
    baseUrl: parsed.data.baseUrl,
    xPlexToken: parsed.data.xPlexToken,
    clientIdentifier: parsed.data.clientIdentifier,
  });

  revalidatePath("/", "layout");
  return { success: true, message: "Server saved" };
}

export async function updateServerToken(input: {
  token: string;
  clientIdentifier: string;
}): Promise<SetupResult> {
  const existing = await db.query.servers.findFirst();
  if (!existing) {
    return { success: false, message: "No server configured" };
  }

  await db
    .update(servers)
    .set({ xPlexToken: input.token, clientIdentifier: input.clientIdentifier })
    .where(eq(servers.id, existing.id));

  revalidatePath("/", "layout");
  return { success: true, message: "Token updated" };
}
