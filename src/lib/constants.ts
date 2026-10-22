export const LIBRARY = {
  name: "Bibliothèque de la Mosquée Salam du Plateau",
  shortName: "Bibliothèque Salam",
  city: "Plateau",
  tagline: "Lire · Apprendre · Se rapprocher d'Allah",
  motto: "Une bibliothèque, un savoir, un avenir meilleur",
  cardKind: "ABONNEMENT",
  cardKindLine2: "BIBLIOTHÈQUE",
  cardKindLine3: "NUMÉRIQUE",
  photoCaption: "PHOTO D'IDENTITÉ",
  qrHint: "Scannez pour accéder à la bibliothèque numérique",
};

export const CARD_WIDTH_MM = 85.6;
export const CARD_HEIGHT_MM = 53.98;
export const A4_WIDTH_MM = 297;
export const A4_HEIGHT_MM = 210;
export const PHOTO_WIDTH_MM = 18;
export const PHOTO_HEIGHT_MM = 22;

export const SUBSCRIPTION_PREFIX = "BSN";
export const EXPIRY_WARNING_DAYS = 30;

export const SESSION_COOKIE = "bms_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

/** En-tête applicatif prouvant une requête émise par l'interface (anti-CSRF). */
export const APP_REQUEST_HEADER = "x-app-request";
export const APP_REQUEST_VALUE = "media-salam";

/** Appels autorisés par minute et par compte pour les sorties lourdes de données. */
export const HEAVY_READ_LIMITS = {
  backup: { max: 3, windowMs: 60_000 },
  csvExport: { max: 3, windowMs: 60_000 },
  // La liste affiche les vignettes et recharge à chaque frappe dans la recherche.
  photos: { max: 120, windowMs: 60_000 },
} as const;

/** Actions irréversibles ou sensibles, plafonnées par compte sur une plus longue fenêtre. */
export const SENSITIVE_WRITE_LIMITS = {
  trash: { max: 20, windowMs: 15 * 60_000 },
  restore: { max: 20, windowMs: 15 * 60_000 },
  purge: { max: 5, windowMs: 15 * 60_000 },
} as const;
