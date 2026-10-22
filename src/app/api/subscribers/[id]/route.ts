import { NextResponse } from "next/server";
import { fail, requireApiUser } from "@/lib/api-guard";
import { SENSITIVE_WRITE_LIMITS } from "@/lib/constants";
import { overLimit } from "@/lib/guard";
import { logActivity } from "@/lib/logs";
import {
  getSubscriber,
  parseSubscriberId,
  trashSubscriber,
  updateSubscriber,
} from "@/lib/subscribers";
import type { SubscriberInput } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  const id = parseSubscriberId((await ctx.params).id);
  if (id === null) return fail("Identifiant invalide.", 400);
  const item = await getSubscriber(id);
  if (!item) return fail("Abonné introuvable.", 404);
  return NextResponse.json({ item });
}

export async function PUT(request: Request, ctx: Ctx) {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  const id = parseSubscriberId((await ctx.params).id);
  if (id === null) return fail("Identifiant invalide.", 400);
  try {
    const body = (await request.json()) as SubscriberInput;
    const previous = await getSubscriber(id);
    const item = await updateSubscriber(id, body);
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

/** Met la fiche à la corbeille : elle reste récupérable jusqu'à la purge. */
export async function DELETE(_request: Request, ctx: Ctx) {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  const id = parseSubscriberId((await ctx.params).id);
  if (id === null) return fail("Identifiant invalide.", 400);
  if (
    await overLimit(`trash:${user.username}`, SENSITIVE_WRITE_LIMITS.trash.max, SENSITIVE_WRITE_LIMITS.trash.windowMs)
  ) {
    return fail("Trop de suppressions à la suite. Réessayez dans quelques minutes.", 429);
  }
  const item = await getSubscriber(id);
  if (!item) return fail("Abonné introuvable.", 404);
  const trashed = await trashSubscriber(id, user.username);
  if (!trashed) return fail("La fiche vient d'être modifiée, rechargez la liste.", 409);
  await logActivity({
    action: "subscriber_trashed",
    details: `Abonné ${item.subscriptionNumber} mis à la corbeille`,
    entityType: "subscriber",
    entityId: id,
    actor: user.username,
  });
  return NextResponse.json({ ok: true });
}
