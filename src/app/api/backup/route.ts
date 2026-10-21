import { NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs, admins, cardErrors, settings, subscribers, subscriptionCounter } from "@/db/schema";
import { fail, requireApiUser } from "@/lib/api-guard";
import { logActivity } from "@/lib/logs";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  try {
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
