import { NextResponse } from "next/server";
import { fail, requireApiUser } from "@/lib/api-guard";
import { logActivity } from "@/lib/logs";
import { deleteSubscriber, getSubscriber, updateSubscriber } from "@/lib/subscribers";
import type { SubscriberInput } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  const { id } = await ctx.params;
  const item = await getSubscriber(Number(id));
  if (!item) return fail("Abonné introuvable.", 404);
  return NextResponse.json({ item });
}

export async function PUT(request: Request, ctx: Ctx) {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  const { id } = await ctx.params;
  try {
    const body = (await request.json()) as SubscriberInput;
    const previous = await getSubscriber(Number(id));
    const item = await updateSubscriber(Number(id), body);
    const actions = ["subscriber_updated"];
    if (body.regenerateNumber) actions.push("number_regenerated");
    if (previous && previous.photoData !== item.photoData) actions.push("photo_updated");
    for (const action of actions) {
      await logActivity({
        action,
        details: `Abonné ${item.subscriptionNumber}`,
        entityType: "subscriber",
        entityId: item.id,
        actor: user.username,
      });
    }
    return NextResponse.json({ item });
  } catch (error) {
    const err = error as Error & { status?: number };
    if (err.status && err.status < 500) return fail(err.message, err.status);
    console.error("Modification d'un abonné :", error);
    return fail("Impossible de modifier l'abonné.", 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  const { id } = await ctx.params;
  const item = await getSubscriber(Number(id));
  if (!item) return fail("Abonné introuvable.", 404);
  await deleteSubscriber(Number(id));
  await logActivity({
    action: "subscriber_deleted",
    details: `Abonné ${item.subscriptionNumber} supprimé`,
    entityType: "subscriber",
    entityId: item.id,
    actor: user.username,
  });
  return NextResponse.json({ ok: true });
}
