import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { fail, requireApiUser } from "@/lib/api-guard";
import { logActivity } from "@/lib/logs";
import { nextSubscriptionNumber } from "@/lib/subscribers";
import { parseCSV, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("Fichier CSV manquant.");
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) return fail("Le fichier CSV ne contient aucune donnée.");
    const header = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
    const idx = (name: string) => header.indexOf(name);
    let created = 0;
    let skipped = 0;
    for (const row of rows.slice(1)) {
      const get = (name: string) => {
        const i = idx(name);
        return i >= 0 ? row[i] ?? "" : "";
      };
      const lastName = get("nom").trim();
      const firstName = get("prenoms").trim() || get("prenom").trim();
      const genderRaw = get("sexe").trim().toLowerCase();
      const phone = get("contact").trim() || get("telephone").trim();
      const validity = get("date_validite").trim() || get("validite").trim();
      if (!lastName || !firstName || !phone) {
        skipped += 1;
        continue;
      }
      const gender = genderRaw.startsWith("f") ? "feminin" : "masculin";
      const providedNumber = get("numero").trim();
      const subscriptionNumber = providedNumber || (await nextSubscriptionNumber());
      try {
        await db.insert(subscribers).values({
          subscriptionNumber,
          lastName: lastName.toUpperCase(),
          firstName,
          gender,
          profession: get("profession").trim() || null,
          phone,
          registrationDate: get("date_enregistrement").trim() || todayISO(),
          validityDate: validity || todayISO(),
          notes: get("notes").trim() || "Import CSV",
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
