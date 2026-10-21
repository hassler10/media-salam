import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { fail, requireApiUser } from "@/lib/api-guard";
import { logActivity } from "@/lib/logs";
import { nextSubscriptionNumber } from "@/lib/subscribers";
import {
  clip,
  isIsoDate,
  MAX_CSV_BYTES,
  MAX_IMPORT_ROWS,
  NUMBER_PATTERN,
  sanitizePhoneNumber,
} from "@/lib/validation";
import { parseCSV, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("Fichier CSV manquant.");
    if (file.size > MAX_CSV_BYTES) return fail("Fichier trop volumineux (2 Mo maximum).");
    if (!/\.csv$/i.test(file.name) && !/text\/|csv/.test(file.type || "")) {
      return fail("Fichier non reconnu : exportez un CSV.");
    }
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) return fail("Le fichier CSV ne contient aucune donnée.");
    if (rows.length - 1 > MAX_IMPORT_ROWS) {
      return fail(`Trop de lignes (maximum ${MAX_IMPORT_ROWS} par import).`);
    }
    const header = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
    const idx = (name: string) => header.indexOf(name);
    let created = 0;
    let skipped = 0;
    for (const row of rows.slice(1)) {
      const get = (name: string) => {
        const i = idx(name);
        return i >= 0 ? row[i] ?? "" : "";
      };
      const lastName = clip(get("nom"), 60);
      const firstName = clip(get("prenoms") || get("prenom"), 80);
      const genderRaw = get("sexe").trim().toLowerCase();
      const phone = sanitizePhoneNumber(get("contact") || get("telephone"));
      const validity = get("date_validite").trim() || get("validite").trim();
      const registration = get("date_enregistrement").trim();
      const profession = clip(get("profession"), 80);
      const notes = clip(get("notes"), 2000);
      if (!lastName || !firstName || !phone) {
        skipped += 1;
        continue;
      }
      if (validity && !isIsoDate(validity)) {
        skipped += 1;
        continue;
      }
      const providedNumber = get("numero").trim().toUpperCase();
      if (providedNumber && !NUMBER_PATTERN.test(providedNumber)) {
        skipped += 1;
        continue;
      }
      const gender = genderRaw.startsWith("f") ? "feminin" : "masculin";
      const subscriptionNumber = providedNumber || (await nextSubscriptionNumber());
      try {
        await db.insert(subscribers).values({
          subscriptionNumber,
          lastName: lastName.toUpperCase(),
          firstName,
          gender,
          profession: profession || null,
          phone,
          registrationDate: isIsoDate(registration) ? registration : todayISO(),
          validityDate: validity || todayISO(),
          notes: notes || "Import CSV",
          isDemo: false,
        });
        created += 1;
      } catch {
        skipped += 1;
      }
    }
    await logActivity({
      action: "csv_imported",
      details: `Import CSV : ${created} créés, ${skipped} ignorés.`,
      actor: user.username,
    });
    return NextResponse.json({ created, skipped });
  } catch (error) {
    console.error(error);
    return fail("Impossible d'importer le fichier CSV.", 500);
  }
}
