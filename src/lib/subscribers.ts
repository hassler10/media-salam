import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { subscribers, subscriptionCounter } from "@/db/schema";
import { SUBSCRIPTION_PREFIX } from "@/lib/constants";
import type { Gender, Subscriber, SubscriberInput } from "@/lib/types";
import { isImageUpload, isIsoDate, MAX_PHOTO_CHARS } from "@/lib/validation";
import { toISODate, toISODateTime, todayISO } from "@/lib/utils";

function mapSubscriber(row: typeof subscribers.$inferSelect): Subscriber {
  return {
    id: row.id,
    subscriptionNumber: row.subscriptionNumber,
    lastName: row.lastName,
    firstName: row.firstName,
    gender: (row.gender === "feminin" ? "feminin" : "masculin") as Gender,
    profession: row.profession,
    phone: row.phone,
    registrationDate: row.registrationDate,
    validityDate: row.validityDate,
    photoData: row.photoData,
    notes: row.notes,
    isDemo: row.isDemo,
    cardGeneratedAt: toISODateTime(row.cardGeneratedAt),
    lastPrintedAt: toISODateTime(row.lastPrintedAt),
    createdAt: toISODateTime(row.createdAt) ?? new Date().toISOString(),
    updatedAt: toISODateTime(row.updatedAt) ?? new Date().toISOString(),
  };
}

export function formatSubscriptionNumber(year: number, n: number): string {
  return `${SUBSCRIPTION_PREFIX}-${year}-${String(n).padStart(6, "0")}`;
}

export async function nextSubscriptionNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(subscriptionCounter)
      .where(eq(subscriptionCounter.year, year))
      .limit(1);

    if (existing.length === 0) {
      await tx.insert(subscriptionCounter).values({ year, lastNumber: 1 });
      return formatSubscriptionNumber(year, 1);
    }

    const next = existing[0].lastNumber + 1;
    await tx
      .update(subscriptionCounter)
      .set({ lastNumber: next })
      .where(eq(subscriptionCounter.year, year));
    return formatSubscriptionNumber(year, next);
  });
  return result;
}

export async function peekNextSubscriptionNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const existing = await db
    .select()
    .from(subscriptionCounter)
    .where(eq(subscriptionCounter.year, year))
    .limit(1);
  const next = existing.length === 0 ? 1 : existing[0].lastNumber + 1;
  return formatSubscriptionNumber(year, next);
}

export function serializeSubscriber(row: typeof subscribers.$inferSelect, includePhoto = true): Subscriber {
  const mapped = mapSubscriber(row);
  if (!includePhoto) {
    mapped.photoData = mapped.photoData ? "[photo]" : null;
  }
  return mapped;
}

export async function listSubscribers(options?: {
  q?: string;
  filter?: string;
  includePhoto?: boolean;
}): Promise<Subscriber[]> {
  const includePhoto = options?.includePhoto ?? false;
  const conditions = [];
  if (options?.q) {
    const term = `%${options.q.trim()}%`;
    conditions.push(
      or(
        ilike(subscribers.lastName, term),
        ilike(subscribers.firstName, term),
        ilike(subscribers.phone, term),
        ilike(subscribers.subscriptionNumber, term),
        ilike(subscribers.profession, term),
      ),
    );
  }
  if (options?.filter === "hommes") conditions.push(eq(subscribers.gender, "masculin"));
  if (options?.filter === "femmes") conditions.push(eq(subscribers.gender, "feminin"));

  const rows = await db
    .select()
    .from(subscribers)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(subscribers.createdAt));

  const today = todayISO();
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  const soonIso = toISODate(soon) ?? today;

  return rows
    .filter((row) => {
      if (options?.filter === "valides") return row.validityDate >= today;
      if (options?.filter === "expires") return row.validityDate < today;
      if (options?.filter === "bientot") {
        return row.validityDate >= today && row.validityDate <= soonIso;
      }
      return true;
    })
    .map((row) => serializeSubscriber(row, includePhoto));
}

export async function getSubscriber(id: number): Promise<Subscriber | null> {
  const rows = await db.select().from(subscribers).where(eq(subscribers.id, id)).limit(1);
  return rows[0] ? mapSubscriber(rows[0]) : null;
}

export function validateInput(input: SubscriberInput): string | null {
  const lastName = input.lastName?.trim();
  const firstName = input.firstName?.trim();
  if (!lastName) return "Le nom est obligatoire.";
  if (lastName.length > 60) return "Nom trop long (60 caractères maximum).";
  if (!firstName) return "Les prénoms sont obligatoires.";
  if (firstName.length > 80) return "Prénoms trop longs (80 caractères maximum).";
  if (input.gender !== "masculin" && input.gender !== "feminin") {
    return "Le sexe doit être Masculin ou Féminin.";
  }
  const phone = input.phone?.trim();
  if (!phone) return "Le contact téléphonique est obligatoire.";
  if (phone.length > 32 || !/^[0-9 +().-]+$/.test(phone)) {
    return "Contact invalide : chiffres, espaces, + ( ) - uniquement, 32 caractères maximum.";
  }
  if ((input.profession?.trim().length ?? 0) > 80) {
    return "Profession trop longue (80 caractères maximum).";
  }
  if ((input.notes?.trim().length ?? 0) > 2000) {
    return "Notes trop longues (2000 caractères maximum).";
  }
  if (!isIsoDate(input.validityDate)) return "Date de validité invalide (format AAAA-MM-JJ).";
  if (input.registrationDate && !isIsoDate(input.registrationDate)) {
    return "Date d'enregistrement invalide (format AAAA-MM-JJ).";
  }
  if (input.photoData && !isImageUpload(input.photoData, MAX_PHOTO_CHARS)) {
    return "Photo refusée : image PNG, JPEG, WEBP ou GIF de 2 Mo maximum.";
  }
  return null;
}

export async function createSubscriber(input: SubscriberInput, isDemo = false): Promise<Subscriber> {
  const error = validateInput(input);
  if (error) throw Object.assign(new Error(error), { status: 400 });
  const subscriptionNumber = await nextSubscriptionNumber();
  const rows = await db
    .insert(subscribers)
    .values({
      subscriptionNumber,
      lastName: input.lastName.trim().toUpperCase(),
      firstName: input.firstName.trim(),
      gender: input.gender,
      profession: input.profession?.trim() || null,
      phone: input.phone.trim(),
      registrationDate: input.registrationDate || todayISO(),
      validityDate: input.validityDate,
      photoData: input.photoData || null,
      notes: input.notes || null,
      isDemo,
      cardGeneratedAt: new Date(),
    })
    .returning();
  return mapSubscriber(rows[0]);
}

export async function updateSubscriber(id: number, input: SubscriberInput): Promise<Subscriber> {
  const error = validateInput(input);
  if (error) throw Object.assign(new Error(error), { status: 400 });
  const current = await getSubscriber(id);
  if (!current) throw Object.assign(new Error("Abonné introuvable."), { status: 404 });

  let subscriptionNumber = current.subscriptionNumber;
  if (input.regenerateNumber) {
    subscriptionNumber = await nextSubscriptionNumber();
  }

  const rows = await db
    .update(subscribers)
    .set({
      subscriptionNumber,
      lastName: input.lastName.trim().toUpperCase(),
      firstName: input.firstName.trim(),
      gender: input.gender,
      profession: input.profession?.trim() || null,
      phone: input.phone.trim(),
      registrationDate: input.registrationDate || current.registrationDate,
      validityDate: input.validityDate,
      photoData: input.photoData === undefined ? current.photoData : input.photoData,
      notes: input.notes ?? current.notes,
      updatedAt: new Date(),
    })
    .where(eq(subscribers.id, id))
    .returning();
  return mapSubscriber(rows[0]);
}

export async function deleteSubscriber(id: number): Promise<void> {
  await db.delete(subscribers).where(eq(subscribers.id, id));
}

export async function markCardGenerated(id: number) {
  await db.update(subscribers).set({ cardGeneratedAt: new Date(), updatedAt: new Date() }).where(eq(subscribers.id, id));
}

export async function markCardPrinted(id: number) {
  await db.update(subscribers).set({ lastPrintedAt: new Date(), updatedAt: new Date() }).where(eq(subscribers.id, id));
}

export async function countSubscribers() {
  const rows = await db.select({ count: sql<number>`count(*)::int` }).from(subscribers);
  return rows[0]?.count ?? 0;
}
