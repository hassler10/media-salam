import { NextResponse } from "next/server";
import { fail, requireApiUser } from "@/lib/api-guard";
import { logActivity } from "@/lib/logs";
import { getSubscriber, markCardGenerated, markCardPrinted } from "@/lib/subscribers";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  const { id } = await ctx.params;
  const item = await getSubscriber(Number(id));
  if (!item) return fail("Abonné introuvable.", 404);
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const action = body.action === "print" ? "print" : body.action === "download" ? "download" : "generate";
  if (action === "print") {
    await markCardPrinted(item.id);
    await logActivity({
      action: "card_printed",
      details: `Impression de la carte ${item.subscriptionNumber}`,
      entityType: "subscriber",
      entityId: item.id,
      actor: user.username,
    });
  } else if (action === "download") {
    await markCardGenerated(item.id);
    await logActivity({
      action: "card_downloaded",
      details: `Téléchargement PDF de la carte ${item.subscriptionNumber}`,
      entityType: "subscriber",
      entityId: item.id,
      actor: user.username,
    });
  } else {
    await markCardGenerated(item.id);
    await logActivity({
      action: "card_generated",
      details: `Génération de la carte ${item.subscriptionNumber}`,
      entityType: "subscriber",
      entityId: item.id,
      actor: user.username,
    });
  }
  return NextResponse.json({ ok: true });
}
