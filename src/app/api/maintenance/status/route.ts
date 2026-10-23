import { and, count, eq, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";
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
  const active = isNull(subscribers.deletedAt);
  const [subscriberRow] = await db.select({ n: count() }).from(subscribers).where(active);
  const [trashedRow] = await db
    .select({ n: count() })
    .from(subscribers)
    .where(isNotNull(subscribers.deletedAt));
  const [photoRow] = await db
    .select({ n: count() })
    .from(subscribers)
    .where(and(active, or(isNull(subscribers.photoData), eq(subscribers.photoData, ""))));
  const [expiredRow] = await db
    .select({ n: count() })
    .from(subscribers)
    .where(and(active, lt(subscribers.validityDate, today)));
  const withPhoto = and(active, isNotNull(subscribers.photoData), ne(subscribers.photoData, ""));
  const [noConsentRow] = await db
    .select({ n: count() })
    .from(subscribers)
    .where(and(withPhoto, eq(subscribers.photoConsent, false)));
  const [expiredPhotoRow] = await db
    .select({ n: count() })
    .from(subscribers)
    .where(and(withPhoto, lt(subscribers.validityDate, today)));
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
      trashCount: Number(trashedRow?.n ?? 0),
      duplicateNumbers: (dupResult.rows ?? []).map((r) => r.subscription_number),
      missingPhotos: Number(photoRow?.n ?? 0),
      photosWithoutConsent: Number(noConsentRow?.n ?? 0),
      expiredPhotos: Number(expiredPhotoRow?.n ?? 0),
      expiredCount: Number(expiredRow?.n ?? 0),
      logCount: Number(logRow?.n ?? 0),
      cardErrorCount: Number(errRow?.n ?? 0),
      lastBackup: lastBackupRow[0]?.value || null,
      adminCount: Number(adminRow?.n ?? 0),
    },
  });
}
