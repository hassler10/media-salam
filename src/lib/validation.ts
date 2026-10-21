const IMAGE_DATA_URL = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;

export const MAX_PHOTO_CHARS = 3_000_000;
export const MAX_LOGO_CHARS = 1_500_000;
export const MAX_CSV_BYTES = 2_000_000;
export const MAX_IMPORT_ROWS = 2000;

export function isImageUpload(value: unknown, maxChars: number): value is string {
  if (typeof value !== "string" || !value) return false;
  return value.length <= maxChars && IMAGE_DATA_URL.test(value);
}

export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    const url = new URL(value.trim());
    return (url.protocol === "https:" || url.protocol === "http:") && !!url.hostname;
  } catch {
    return false;
  }
}

export function clip(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export const NUMBER_PATTERN = /^[A-Z0-9._-]{4,32}$/i;

export function sanitizePhoneNumber(value: string): string {
  return value.replace(/[^\d +().-]/g, "").slice(0, 32);
}
