import { NextResponse } from "next/server";
import { fail, requireApiUser } from "@/lib/api-guard";
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
      details: `${created.lastName} ${created.firstName} — ${created.subscriptionNumber}`,
      entityType: "subscriber",
      entityId: created.id,
      actor: user.username,
    });
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    const err = error as Error & { status?: number };
    return fail(err.message || "Impossible d'enregistrer l'abonné.", err.status ?? 500);
  }
}
