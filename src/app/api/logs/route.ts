import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { requireApiUser } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 500);
  const rows = await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit);
  return NextResponse.json({
    items: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}
