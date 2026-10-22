import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

const SECRET = process.env.SESSION_SECRET;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normal = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normal + "=".repeat((4 - (normal.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Rôle issu d'un cookie dont la signature HMAC et l'expiration sont valides, sinon null. */
async function roleFromCookie(token: string | undefined): Promise<string | null> {
  if (!token || !SECRET) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
    if (!constantTimeEqual(toBase64Url(new Uint8Array(mac)), signature)) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(data))) as {
      role?: string;
      exp?: number;
    };
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload.role === "superadmin" ? "superadmin" : payload.role ? "administrateur" : null;
  } catch {
    return null;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";
  const role = await roleFromCookie(request.cookies.get(SESSION_COOKIE)?.value);

  if (!role) {
    return isLoginPage
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/parametres") && role !== "superadmin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|favicon|icon|robots|sitemap|.*\\.).*)"],
};
