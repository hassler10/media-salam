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
};

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
};

const BOOL_KEYS = ["showMosque", "showFooterMotto"] as const;

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
