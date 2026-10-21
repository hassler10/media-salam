import { count, eq, isNull, lt, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs, admins, cardErrors, settings, subscribers } from "@/db/schema";
import { requireApiUser } from "@/lib/api-guard";
import { todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  let database: "ok" | "erreur" = "ok";
  let databaseMessage = "Connexion PostgreSQL active.";
  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    database = "erreur";
    databaseMessage = "Connexion à la base de données indisponible.";
    console.error("Contrôle de la base :", error);
  }

  const today = todayISO();
  const [subscriberRow] = await db.select({ n: count() }).from(subscribers);
  const [photoRow] = await db
    .select({ n: count() })
    .from(subscribers)
    .where(or(isNull(subscribers.photoData), eq(subscribers.photoData, "")));
  const [expiredRow] = await db
    .select({ n: count() })
    .from(subscribers)
    .where(lt(subscribers.validityDate, today));
  const [logRow] = await db.select({ n: count() }).from(activityLogs);
  const [errRow] = await db.select({ n: count() }).from(cardErrors);
  const [adminRow] = await db.select({ n: count() }).from(admins);
  const lastBackupRow = await db.select().from(settings).where(eq(settings.key, "lastBackup"));

  const dupResult = await db.execute<{ subscription_number: string }>(
    sql`select subscription_number from subscribers group by subscription_number having count(*) > 1`,
  );

  return NextResponse.json({
    status: {
      database,
      databaseMessage,
      subscriberCount: Number(subscriberRow?.n ?? 0),
      duplicateNumbers: (dupResult.rows ?? []).map((r) => r.subscription_number),
      missingPhotos: Number(photoRow?.n ?? 0),
      expiredCount: Number(expiredRow?.n ?? 0),
      logCount: Number(logRow?.n ?? 0),
      cardErrorCount: Number(errRow?.n ?? 0),
      lastBackup: lastBackupRow[0]?.value || null,
      adminCount: Number(adminRow?.n ?? 0),
    },
  });
}
