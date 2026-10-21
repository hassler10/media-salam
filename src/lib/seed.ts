import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { subscribers, subscriptionCounter } from "@/db/schema";
import { ensureDefaultAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logs";
import { countSubscribers, formatSubscriptionNumber } from "@/lib/subscribers";
import { addYearsISO } from "@/lib/utils";

async function photoDataUrl(filename: string): Promise<string | null> {
  try {
    const buf = await readFile(path.join(process.cwd(), "public", "demo", filename));
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return `/demo/${filename}`;
  }
}

const DEMO = [
  {
    lastName: "KONÉ",
    firstName: "Amadou",
    gender: "masculin" as const,
    profession: "Enseignant",
    phone: "+225 07 01 23 45 67",
    registrationDate: "2026-01-12",
    photo: "portrait-homme-1.jpg",
    notes: "Donnée de démonstration",
  },
  {
    lastName: "TRAORÉ",
    firstName: "Fatoumata",
    gender: "feminin" as const,
    profession: "Commerçante",
    phone: "+225 05 12 34 56 78",
    registrationDate: "2026-02-03",
    photo: "portrait-femme-1.jpg",
    notes: "Donnée de démonstration",
  },
  {
    lastName: "DIALLO",
    firstName: "Ibrahim",
    gender: "masculin" as const,
    profession: "Ingénieur informaticien",
    phone: "+225 07 45 67 89 01",
    registrationDate: "2026-03-18",
    photo: "portrait-homme-2.jpg",
    notes: "Donnée de démonstration",
  },
  {
    lastName: "COULIBALY",
    firstName: "Aïcha",
    gender: "feminin" as const,
    profession: "Infirmière",
    phone: "+225 01 23 45 67 89",
    registrationDate: "2025-09-20",
    photo: "portrait-femme-2.jpg",
    notes: "Donnée de démonstration — abonnement bientôt expiré",
  },
  {
    lastName: "OUATTARA",
    firstName: "Seydou",
    gender: "masculin" as const,
    profession: "Comptable",
    phone: "+225 07 89 01 23 45",
    registrationDate: "2025-04-02",
    photo: "portrait-homme-3.jpg",
    notes: "Donnée de démonstration — abonnement expiré",
  },
  {
    lastName: "BAMBA",
    firstName: "Mariam",
    gender: "feminin" as const,
    profession: "Étudiante",
    phone: "+225 05 67 89 01 23",
    registrationDate: "2026-01-28",
    photo: "portrait-femme-3.jpg",
    notes: "Donnée de démonstration",
  },
];

export async function seedDemoData(force = false): Promise<{ created: number; skipped: boolean }> {
  await ensureDefaultAdmin();
  const existing = await countSubscribers();
  if (existing > 0 && !force) {
    return { created: 0, skipped: true };
  }

  const year = 2026;
  let created = 0;
  for (let i = 0; i < DEMO.length; i += 1) {
    const item = DEMO[i];
    const photoData = await photoDataUrl(item.photo);
    const validity =
      item.lastName === "OUATTARA"
        ? "2026-04-02"
        : item.lastName === "COULIBALY"
          ? addYearsISO(item.registrationDate, 1)
          : addYearsISO(item.registrationDate, 1);
    await db
      .insert(subscribers)
      .values({
        subscriptionNumber: formatSubscriptionNumber(year, i + 1),
        lastName: item.lastName,
        firstName: item.firstName,
        gender: item.gender,
        profession: item.profession,
        phone: item.phone,
        registrationDate: item.registrationDate,
        validityDate: validity,
        photoData,
        notes: item.notes,
        isDemo: true,
        cardGeneratedAt: new Date(),
      })
      .onConflictDoNothing({ target: subscribers.subscriptionNumber });
    created += 1;
  }

  await db
    .insert(subscriptionCounter)
    .values({ year, lastNumber: DEMO.length })
    .onConflictDoUpdate({
      target: subscriptionCounter.year,
      set: { lastNumber: DEMO.length },
    });

  await logActivity({
    action: "demo_seeded",
    details: `${created} abonnés de démonstration enregistrés.`,
    actor: "système",
  });

  return { created, skipped: false };
}
