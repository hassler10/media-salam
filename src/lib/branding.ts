import { LIBRARY } from "@/lib/constants";

export type CardBranding = {
  institutionName: string;
  shortName: string;
  titleLine1: string;
  titleLine2: string;
  titleLine3: string;
  tagline: string;
  motto: string;
  bannerLine1: string;
  bannerLine2: string;
  bannerLine3: string;
  photoCaption: string;
  qrHint: string;
  extraLine: string;
  extraFieldLabel: string;
  extraFieldValue: string;
  logoData: string;
  publicBaseUrl: string;
  malePrimary: string;
  maleAccent: string;
  femalePrimary: string;
  femaleAccent: string;
  showMosque: boolean;
  showFooterMotto: boolean;
  defaultValidityMonths: string;
  fontFamily: string;
  titleScale: string;
  fieldScale: string;
  bannerScale: string;
  hintScale: string;
  qrScale: string;
  headerOffsetY: string;
  fieldsOffsetY: string;
  fieldsOffsetX: string;
  photoOffsetY: string;
  qrOffsetY: string;
  titleAlign: string;
  fieldsAlign: string;
  cardStyle: string;
  cornerRadius: string;
  patternOpacity: string;
  cardBackground: string;
};

export const CARD_FONTS = [
  { value: "card", label: "Barlow Condensé (carte d'origine)" },
  { value: "sans", label: "Source Sans (lisible, moderne)" },
  { value: "display", label: "Cinzel (titres arabesque)" },
  { value: "serif", label: "Serif classique (Times)" },
  { value: "mono", label: "Monospace (machine à écrire)" },
] as const;

export const CARD_STYLES = [
  { value: "classique", label: "Classique (motif + courbe dorée)" },
  { value: "moderne", label: "Moderne (sans motif, bandeau droit)" },
  { value: "sobre", label: "Sobre (motif très léger)" },
  { value: "solemnel", label: "Solemnel (titres en majuscules ornées)" },
] as const;

export const ALIGNMENTS = [
  { value: "left", label: "À gauche" },
  { value: "center", label: "Centré" },
  { value: "right", label: "À droite" },
] as const;

export const FONT_VALUES = CARD_FONTS.map((f) => f.value);
export const STYLE_VALUES = CARD_STYLES.map((s) => s.value);
export const ALIGN_VALUES = ALIGNMENTS.map((a) => a.value);

export const CARD_COLORS = [
  "malePrimary",
  "maleAccent",
  "femalePrimary",
  "femaleAccent",
  "cardBackground",
] as const;

/** Réglages de design réinitialisables ensemble dans Super admin. */
export const DESIGN_KEYS = [
  "fontFamily",
  "titleScale",
  "fieldScale",
  "bannerScale",
  "hintScale",
  "qrScale",
  "headerOffsetY",
  "fieldsOffsetY",
  "fieldsOffsetX",
  "photoOffsetY",
  "qrOffsetY",
  "titleAlign",
  "fieldsAlign",
  "cardStyle",
  "cornerRadius",
  "patternOpacity",
  "cardBackground",
] as const satisfies readonly (keyof CardBranding)[];

/** Valeurs d'origine des réglages de design, pour la réinitialisation Super admin. */
export function designDefaults(): Partial<CardBranding> {
  const design: Partial<CardBranding> = {};
  for (const key of DESIGN_KEYS) design[key] = DEFAULT_BRANDING[key] as never;
  return design;
}

export const NUMBER_LIMITS: Record<string, { min: number; max: number }> = {
  titleScale: { min: 0.7, max: 1.6 },
  fieldScale: { min: 0.7, max: 1.6 },
  bannerScale: { min: 0.7, max: 1.6 },
  hintScale: { min: 0.7, max: 1.8 },
  qrScale: { min: 0.7, max: 1.4 },
  headerOffsetY: { min: -4, max: 6 },
  fieldsOffsetY: { min: -6, max: 8 },
  fieldsOffsetX: { min: -8, max: 8 },
  photoOffsetY: { min: -6, max: 8 },
  qrOffsetY: { min: -6, max: 8 },
  cornerRadius: { min: 0, max: 5 },
  patternOpacity: { min: 0, max: 1 },
};

export function clampNumber(value: unknown, key: string): string | null {
  const limits = NUMBER_LIMITS[key];
  if (!limits) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return String(Math.min(limits.max, Math.max(limits.min, n)));
}

/** Lit un réglage numérique de la carte, avec bornes de sécurité. */
export function num(branding: CardBranding, key: keyof CardBranding, fallback: number): number {
  const raw = Number(branding[key]);
  if (!Number.isFinite(raw)) return fallback;
  const limits = NUMBER_LIMITS[key as string];
  if (!limits) return raw;
  return Math.min(limits.max, Math.max(limits.min, raw));
}

/** Nom de police autorisé, sinon celui de la carte d'origine. */
export function cssFontFamily(branding: CardBranding): string {
  const map: Record<string, string> = {
    card: "var(--font-card), 'Arial Narrow', sans-serif",
    sans: "var(--font-sans), 'Segoe UI', sans-serif",
    display: "var(--font-display), serif",
    serif: "Georgia, 'Times New Roman', serif",
    mono: "'Courier New', monospace",
  };
  return map[branding.fontFamily] ?? map.card;
}

export const DEFAULT_BRANDING: CardBranding = {
  institutionName: LIBRARY.name,
  shortName: LIBRARY.shortName,
  titleLine1: "BIBLIOTHÈQUE",
  titleLine2: "DE LA MOSQUÉE SALAM",
  titleLine3: "DU PLATEAU",
  tagline: LIBRARY.tagline,
  motto: LIBRARY.motto,
  bannerLine1: "ABONNEMENT",
  bannerLine2: "BIBLIOTHÈQUE",
  bannerLine3: "NUMÉRIQUE",
  photoCaption: LIBRARY.photoCaption,
  qrHint: LIBRARY.qrHint,
  extraLine: "",
  extraFieldLabel: "",
  extraFieldValue: "",
  logoData: "",
  publicBaseUrl: "",
  malePrimary: "#0C5A35",
  maleAccent: "#C9A227",
  femalePrimary: "#4A4A4A",
  femaleAccent: "#C0C4C8",
  showMosque: true,
  showFooterMotto: true,
  defaultValidityMonths: "12",
  fontFamily: "card",
  titleScale: "1",
  fieldScale: "1",
  bannerScale: "1",
  hintScale: "1",
  qrScale: "1",
  headerOffsetY: "0",
  fieldsOffsetY: "0",
  fieldsOffsetX: "0",
  photoOffsetY: "0",
  qrOffsetY: "0",
  titleAlign: "left",
  fieldsAlign: "left",
  cardStyle: "classique",
  cornerRadius: "2.6",
  patternOpacity: "0.9",
  cardBackground: "#ffffff",
};

const BOOL_KEYS = ["showMosque", "showFooterMotto"] as const;

export const TEXT_KEYS: (keyof CardBranding)[] = [
  "institutionName",
  "shortName",
  "titleLine1",
  "titleLine2",
  "titleLine3",
  "tagline",
  "motto",
  "bannerLine1",
  "bannerLine2",
  "bannerLine3",
  "photoCaption",
  "qrHint",
  "extraLine",
  "extraFieldLabel",
  "extraFieldValue",
];

export function brandingToMap(b: CardBranding): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [key, value] of Object.entries(b)) {
    if (typeof value === "boolean") map[key] = value ? "1" : "0";
    else map[key] = value ?? "";
  }
  return map;
}

export function mapToBranding(map: Record<string, string>): CardBranding {
  const next: CardBranding = { ...DEFAULT_BRANDING };
  for (const key of Object.keys(DEFAULT_BRANDING) as (keyof CardBranding)[]) {
    if (!(key in map) || map[key] === undefined) continue;
    if ((BOOL_KEYS as readonly string[]).includes(key)) {
      next[key] = (map[key] === "1" || map[key] === "true") as never;
    } else {
      (next as unknown as Record<string, string>)[key] = map[key];
    }
  }
  return next;
}

export function logoSrc(branding: CardBranding): string | null {
  return branding.logoData?.trim() || null;
}
