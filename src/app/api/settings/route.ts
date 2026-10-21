import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { fail, requireApiUser, requireSuperAdmin } from "@/lib/api-guard";
import { brandingToMap, mapToBranding, type CardBranding } from "@/lib/branding";
import { loadBranding } from "@/lib/branding-server";
import { logActivity } from "@/lib/logs";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  const branding = await loadBranding();
  return NextResponse.json({ settings: brandingToMap(branding), branding });
}

export async function PUT(request: Request) {
  const { user, response } = await requireSuperAdmin();
  if (!user) return response;
  try {
    const body = (await request.json()) as Partial<CardBranding> & Record<string, string>;
    const current = await loadBranding();
    const merged = mapToBranding({
      ...brandingToMap(current),
      ...Object.fromEntries(
        Object.entries(body).map(([k, v]) => [k, typeof v === "boolean" ? (v ? "1" : "0") : String(v ?? "")]),
      ),
    });
    const map = brandingToMap(merged);
    for (const [key, value] of Object.entries(map)) {
      await db.insert(settings).values({ key, value }).onConflictDoUpdate({
        target: settings.key,
        set: { value },
      });
    }
    await logActivity({
      action: "settings_updated",
      details: "Paramètres super admin de la carte mis à jour.",
      actor: user.username,
    });
    return NextResponse.json({ ok: true, branding: merged });
  } catch (error) {
    console.error(error);
    return fail("Impossible d'enregistrer les paramètres.", 500);
  }
}
