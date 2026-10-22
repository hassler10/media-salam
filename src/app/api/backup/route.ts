import { NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs, admins, cardErrors, settings, subscribers, subscriptionCounter } from "@/db/schema";
import { fail, requireSuperAdmin } from "@/lib/api-guard";
import { overLimit } from "@/lib/guard";
import { HEAVY_READ_LIMITS } from "@/lib/constants";
import { logActivity } from "@/lib/logs";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireSuperAdmin();
  if (!user) return response;
  try {
    if (
      await overLimit(
        `backup:${user.username}`,
        HEAVY_READ_LIMITS.backup.max,
        HEAVY_READ_LIMITS.backup.windowMs,
      )
    ) {
      return fail("Trop de sauvegardes à la suite. Réessayez dans une minute.", 429);
    }
    const [subs, logs, ads, errs, sets, counters] = await Promise.all([
      db.select().from(subscribers),
      db.select().from(activityLogs),
      db.select({
        id: admins.id,
        username: admins.username,
        displayName: admins.displayName,
        role: admins.role,
        createdAt: admins.createdAt,
      }).from(admins),
      db.select().from(cardErrors),
      db.select().from(settings),
      db.select().from(subscriptionCounter),
    ]);

    const now = new Date().toISOString();
    await db.insert(settings).values({ key: "lastBackup", value: now }).onConflictDoUpdate({
      target: settings.key,
      set: { value: now },
    });
    await logActivity({
      action: "backup_created",
      details: `Sauvegarde JSON de ${subs.length} abonnés.`,
      actor: user.username,
    });

    return NextResponse.json({
      generatedAt: now,
      subscribers: subs,
      activityLogs: logs,
      admins: ads,
      cardErrors: errs,
      settings: sets,
      subscriptionCounter: counters,
    });
  } catch (error) {
    console.error(error);
    return fail("Impossible de créer la sauvegarde.", 500);
  }
}
