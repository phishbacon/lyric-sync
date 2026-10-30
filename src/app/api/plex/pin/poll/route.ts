import { NextResponse } from "next/server";
import { z } from "zod";

import { checkPin } from "@/lib/server/plex/auth";

const pollQuerySchema = z.object({
  pinId: z.coerce.number().int(),
  pinCode: z.string().min(1),
  clientIdentifier: z.string().min(1),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = pollQuerySchema.safeParse({
    pinId: url.searchParams.get("pinId"),
    pinCode: url.searchParams.get("pinCode"),
    clientIdentifier: url.searchParams.get("clientIdentifier"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { authenticated: false, message: "Missing or invalid poll parameters" },
      { status: 400 },
    );
  }

  const token = await checkPin(
    { pinId: parsed.data.pinId, pinCode: parsed.data.pinCode },
    parsed.data.clientIdentifier,
  );

  if (token === null) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({ authenticated: true, token });
}
