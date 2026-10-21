import { db } from "@/db";
import { settings } from "@/db/schema";
import { mapToBranding, type CardBranding } from "@/lib/branding";

export async function loadBranding(): Promise<CardBranding> {
  const rows = await db.select().from(settings);
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return mapToBranding(map);
}
