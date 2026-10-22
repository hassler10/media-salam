import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { fail, requireApiUser, requireSuperAdmin } from "@/lib/api-guard";
import {
  ALIGN_VALUES,
  CARD_COLORS,
  clampNumber,
  DEFAULT_BRANDING,
  FONT_VALUES,
  NUMBER_LIMITS,
  STYLE_VALUES,
  brandingToMap,
  mapToBranding,
  type CardBranding,
} from "@/lib/branding";
import { loadBranding } from "@/lib/branding-server";
import { logActivity } from "@/lib/logs";
import { clip, isHttpUrl, isImageUpload, MAX_LOGO_CHARS } from "@/lib/validation";
import { TEXT_KEYS } from "@/lib/branding";

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
    if (merged.logoData && !isImageUpload(merged.logoData, MAX_LOGO_CHARS)) {
      return fail("Logo refusé : image PNG, JPEG, WEBP ou GIF de 1 Mo maximum.");
    }
    if (merged.publicBaseUrl) {
      if (!isHttpUrl(merged.publicBaseUrl)) {
        return fail("Lien de la bibliothèque invalide : indiquez une adresse commençant par https://");
      }
      merged.publicBaseUrl = merged.publicBaseUrl.trim().slice(0, 300);
    }
    for (const key of TEXT_KEYS) {
      merged[key] = clip(merged[key], 120) as never;
    }
    const months = Number(merged.defaultValidityMonths);
    if (!Number.isInteger(months) || months < 1 || months > 60) {
      return fail("Durée de validité par défaut : entre 1 et 60 mois.");
    }
    if (!(FONT_VALUES as readonly string[]).includes(merged.fontFamily)) {
      merged.fontFamily = DEFAULT_BRANDING.fontFamily;
    }
    if (!(STYLE_VALUES as readonly string[]).includes(merged.cardStyle)) {
      merged.cardStyle = DEFAULT_BRANDING.cardStyle;
    }
    if (!(ALIGN_VALUES as readonly string[]).includes(merged.titleAlign)) {
      merged.titleAlign = DEFAULT_BRANDING.titleAlign;
    }
    if (!(ALIGN_VALUES as readonly string[]).includes(merged.fieldsAlign)) {
      merged.fieldsAlign = DEFAULT_BRANDING.fieldsAlign;
    }
    for (const key of Object.keys(NUMBER_LIMITS) as (keyof CardBranding)[]) {
      const clamped = clampNumber(merged[key], key as string);
      if (clamped === null) return fail("Réglage de carte non numérique : " + key);
      merged[key] = clamped as never;
    }
    for (const key of CARD_COLORS) {
      if (!/^#[0-9a-f]{6}$/i.test(merged[key])) {
        return fail(`Couleur invalide : ${key}.`);
      }
    }
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
