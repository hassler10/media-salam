import { EXPIRY_WARNING_DAYS } from "@/lib/constants";
import type { SubscriberStatus } from "@/lib/types";

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addYearsISO(iso: string, years: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y + years}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function formatDateFR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatDateTimeFR(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function daysUntil(iso: string): number {
  const target = isoToDate(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function getStatus(validityDate: string): SubscriberStatus {
  const days = daysUntil(validityDate);
  if (days < 0) return "expire";
  if (days <= EXPIRY_WARNING_DAYS) return "bientot";
  return "valide";
}

export function statusLabel(status: SubscriberStatus): string {
  if (status === "expire") return "Expiré";
  if (status === "bientot") return "Expire bientôt";
  return "Valide";
}

export function genderLabel(gender: string): string {
  return gender === "feminin" ? "Féminin" : "Masculin";
}

export function fullName(lastName: string, firstName: string): string {
  return `${lastName.toUpperCase()} ${firstName}`.trim();
}

export function fitFontMm(text: string, maxChars: number, baseMm: number, minMm: number): number {
  if (!text) return baseMm;
  if (text.length <= maxChars) return baseMm;
  const scaled = baseMm * (maxChars / text.length);
  return Math.max(minMm, scaled);
}

export function toISODate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toISODateTime(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((c) => c.length > 0)) rows.push(row);
  }
  return rows;
}

export function csvEscape(value: string | null | undefined): string {
  const v = value ?? "";
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function actionLabel(action: string): string {
  const map: Record<string, string> = {
    login: "Connexion",
    logout: "Déconnexion",
    subscriber_created: "Abonné enregistré",
    subscriber_updated: "Abonné modifié",
    subscriber_deleted: "Abonné supprimé",
    photo_updated: "Photo mise à jour",
    card_generated: "Carte générée",
    card_printed: "Carte imprimée",
    card_downloaded: "Carte téléchargée (PDF)",
    number_regenerated: "Numéro régénéré",
    csv_exported: "Export CSV",
    csv_imported: "Import CSV",
    backup_created: "Sauvegarde créée",
    demo_seeded: "Données de démonstration chargées",
    admin_created: "Compte administrateur créé",
    password_changed: "Mot de passe modifié",
    settings_updated: "Paramètres mis à jour",
    card_error: "Erreur de génération de carte",
  };
  return map[action] ?? action;
}
