import { NextResponse } from "next/server";
import { isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { requireApiUser } from "@/lib/api-guard";
import { todayISO, toISODate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  const today = todayISO();
  const soonDate = new Date();
  soonDate.setDate(soonDate.getDate() + 30);
  const soon = toISODate(soonDate) ?? today;

  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      valid: sql<number>`count(*) filter (where ${subscribers.validityDate} >= ${today})::int`,
      expired: sql<number>`count(*) filter (where ${subscribers.validityDate} < ${today})::int`,
      expiringSoon: sql<number>`count(*) filter (where ${subscribers.validityDate} >= ${today} and ${subscribers.validityDate} <= ${soon})::int`,
      men: sql<number>`count(*) filter (where ${subscribers.gender} = 'masculin')::int`,
      women: sql<number>`count(*) filter (where ${subscribers.gender} = 'feminin')::int`,
      withPhoto: sql<number>`count(*) filter (where ${subscribers.photoData} is not null and ${subscribers.photoData} <> '')::int`,
      withoutPhoto: sql<number>`count(*) filter (where ${subscribers.photoData} is null or ${subscribers.photoData} = '')::int`,
      cardsGenerated: sql<number>`count(*) filter (where ${subscribers.cardGeneratedAt} is not null)::int`,
    })
    .from(subscribers)
    .where(isNull(subscribers.deletedAt));

  return NextResponse.json({
    stats: {
      total: row?.total ?? 0,
      valid: row?.valid ?? 0,
      expired: row?.expired ?? 0,
      expiringSoon: row?.expiringSoon ?? 0,
      men: row?.men ?? 0,
      women: row?.women ?? 0,
      withPhoto: row?.withPhoto ?? 0,
      withoutPhoto: row?.withoutPhoto ?? 0,
      cardsGenerated: row?.cardsGenerated ?? 0,
    },
  });
}
