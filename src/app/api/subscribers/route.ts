import { NextResponse } from "next/server";
import { fail, requireApiUser } from "@/lib/api-guard";
import { overLimit } from "@/lib/guard";
import { HEAVY_READ_LIMITS } from "@/lib/constants";
import { logActivity } from "@/lib/logs";
import { createSubscriber, listSubscribers } from "@/lib/subscribers";
import type { SubscriberInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const filter = url.searchParams.get("filter") ?? undefined;
  const includePhoto = url.searchParams.get("photos") === "1";
  if (
    includePhoto &&
    (await overLimit(
      `photos:${user.username}`,
      HEAVY_READ_LIMITS.photos.max,
      HEAVY_READ_LIMITS.photos.windowMs,
    ))
  ) {
    return fail("Trop d'ouvertures de cartes à la suite. Réessayez dans une minute.", 429);
  }
  const items = await listSubscribers({ q, filter, includePhoto });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  try {
    const body = (await request.json()) as SubscriberInput;
    const created = await createSubscriber(body);
    await logActivity({
      action: "subscriber_created",
      details: `Abonné ${created.subscriptionNumber} créé`,
      entityType: "subscriber",
      entityId: created.id,
      actor: user.username,
    });
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    const err = error as Error & { status?: number };
    if (err.status && err.status < 500) return fail(err.message, err.status);
    console.error("Création d'un abonné :", error);
    return fail("Impossible d'enregistrer l'abonné.", 500);
  }
}
