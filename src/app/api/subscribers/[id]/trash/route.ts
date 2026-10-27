import { NextResponse } from "next/server";
import { fail, requireApiUser } from "@/lib/api-guard";
import { SENSITIVE_WRITE_LIMITS } from "@/lib/constants";
import { overLimit } from "@/lib/guard";
import { logActivity } from "@/lib/logs";
import { notifyLibrary } from "@/lib/library-webhook";
import { getSubscriber, parseSubscriberId, purgeSubscriber, restoreSubscriber } from "@/lib/subscribers";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Deux voies de sortie de la corbeille : restauration sans condition,
 * purge définitive uniquement si le numéro d'abonnement est retapé.
 */
export async function POST(request: Request, ctx: Ctx) {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  const id = parseSubscriberId((await ctx.params).id);
  if (id === null) return fail("Identifiant invalide.", 400);
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    confirm?: string;
  };
  const action = body.action === "restore" ? "restore" : body.action === "purge" ? "purge" : null;
  if (!action) return fail("Action inconnue.", 400);

  const item = await getSubscriber(id, { includeDeleted: true });
  if (!item) return fail("Abonné introuvable.", 404);
  if (!item.deletedAt) return fail("Cette fiche n'est pas à la corbeille.", 409);

  if (action === "restore") {
    if (
      await overLimit(
        `restore:${user.username}`,
        SENSITIVE_WRITE_LIMITS.restore.max,
        SENSITIVE_WRITE_LIMITS.restore.windowMs,
      )
    ) {
      return fail("Trop de restaurations à la suite. Réessayez dans quelques minutes.", 429);
    }
    const restored = await restoreSubscriber(id);
    if (!restored) return fail("La fiche vient d'être modifiée, rechargez la corbeille.", 409);
    await logActivity({
      action: "subscriber_restored",
      details: `Abonné ${item.subscriptionNumber} restauré`,
      entityType: "subscriber",
      entityId: id,
      actor: user.username,
    });
    const current = await getSubscriber(id, { includeDeleted: true });
    const librarySync = current ? await notifyLibrary("subscriber.changed", current) : "failed";
    if (librarySync === "failed") {
      await logActivity({
        action: "library_webhook_failed",
        details: "La notification de mise à jour du registre Salam Library a échoué.",
        entityType: "subscriber",
        entityId: id,
        actor: user.username,
      });
    }
    return NextResponse.json({ ok: true, librarySync });
  }

  if (
    await overLimit(
      `purge:${user.username}`,
      SENSITIVE_WRITE_LIMITS.purge.max,
      SENSITIVE_WRITE_LIMITS.purge.windowMs,
    )
  ) {
    return fail("Trop de purges à la suite. Réessayez dans quelques minutes.", 429);
  }
  if ((body.confirm ?? "").trim().toUpperCase() !== item.subscriptionNumber.toUpperCase()) {
    return fail("Le numéro d'abonnement retapé ne correspond pas.", 400);
  }
  const purged = await purgeSubscriber(id);
  if (!purged) return fail("La fiche vient d'être modifiée, rechargez la corbeille.", 409);
  await logActivity({
    action: "subscriber_purged",
    details: `Abonné ${item.subscriptionNumber} supprimé définitivement`,
    entityType: "subscriber",
    entityId: id,
    actor: user.username,
  });
  const librarySync = await notifyLibrary("registry.refresh");
  if (librarySync === "failed") {
    await logActivity({
      action: "library_webhook_failed",
      details: "La notification de mise à jour du registre Salam Library a échoué.",
      entityType: "subscriber",
      entityId: id,
      actor: user.username,
    });
  }
  return NextResponse.json({ ok: true, librarySync });
}
