import { and, isNotNull, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { fail, requireSuperAdmin } from "@/lib/api-guard";
import { HEAVY_READ_LIMITS } from "@/lib/constants";
import { overLimit } from "@/lib/guard";
import { logActivity } from "@/lib/logs";

export const dynamic = "force-dynamic";

/** Les visages sont hors de la sauvegarde courante : cette archive est séparée, plafonnée et journalisée. */
export async function GET() {
  const { user, response } = await requireSuperAdmin();
  if (!user) return response;
  try {
    if (
      await overLimit(
        `photoArchive:${user.username}`,
        HEAVY_READ_LIMITS.photoArchive.max,
        HEAVY_READ_LIMITS.photoArchive.windowMs,
      )
    ) {
      return fail("Trop d'archives de visages à la suite. Réessayez dans quelques minutes.", 429);
    }
    const rows = await db
      .select({
        id: subscribers.id,
        subscriptionNumber: subscribers.subscriptionNumber,
        photoData: subscribers.photoData,
      })
      .from(subscribers)
      .where(and(isNotNull(subscribers.photoData), ne(subscribers.photoData, "")));
    await logActivity({
      action: "photos_archived",
      details: `Archive de ${rows.length} visages téléchargée.`,
      actor: user.username,
    });
    return NextResponse.json({ generatedAt: new Date().toISOString(), count: rows.length, photos: rows });
  } catch (error) {
    console.error("Archive des visages :", error);
    return fail("Impossible de constituer l'archive des visages.", 500);
  }
}
