import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/constants";
import { ensureSchema } from "@/lib/ensure-schema";
import type { SessionUser } from "@/lib/types";

const SECRET = process.env.SESSION_SECRET;

// Le compte administrateur initial vient de l'environnement : sans
// SEED_ADMIN_PASSWORD, aucun compte n'est créé automatiquement.
const SEED_ADMIN = {
  username: process.env.SEED_ADMIN_USERNAME?.trim() || "bibliothecaire",
  displayName: process.env.SEED_ADMIN_DISPLAY_NAME?.trim() || "Bibliothécaire",
  password: process.env.SEED_ADMIN_PASSWORD ?? "",
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const test = scryptSync(password, salt, 32);
    const storedBuf = Buffer.from(hash, "hex");
    if (storedBuf.length !== test.length) return false;
    return timingSafeEqual(storedBuf, test);
  } catch {
    return false;
  }
}

type SessionPayload = {
  id: number;
  username: string;
  displayName: string;
  role: string;
  exp: number;
};

export function signSession(user: SessionUser): string {
  if (!SECRET) {
    throw Object.assign(new Error("SESSION_SECRET absent : impossible de signer une session."), {
      status: 500,
    });
  }
  const payload: SessionPayload = {
    ...user,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function readSession(token: string | undefined | null): SessionUser | null {
  if (!token || !SECRET) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = createHmac("sha256", SECRET).update(data).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return {
      id: payload.id,
      username: payload.username,
      displayName: payload.displayName,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const tokenUser = readSession(store.get(SESSION_COOKIE)?.value);
  if (!tokenUser) return null;
  // Role et identité viennent toujours de la base : un compte supprimé ou désactivé
  // perd immédiatement l'accès, et une erreur de base refuse la session.
  const admin = await findAdminByUsername(tokenUser.username);
  if (!admin) return null;
  return {
    id: admin.id,
    username: admin.username,
    displayName: admin.displayName,
    role: admin.role,
  };
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw Object.assign(new Error("Non authentifié"), { status: 401 });
  }
  return user;
}

export async function ensureDefaultAdmin(): Promise<void> {
  await ensureSchema();
  if (!SEED_ADMIN.password) return;
  const existing = await db.select({ id: admins.id }).from(admins).limit(1);
  if (existing.length > 0) return;
  await db.insert(admins).values({
    username: SEED_ADMIN.username,
    passwordHash: hashPassword(SEED_ADMIN.password),
    displayName: SEED_ADMIN.displayName,
    role: "superadmin",
  });
}

export async function findAdminByUsername(username: string) {
  const rows = await db
    .select()
    .from(admins)
    .where(sql`lower(${admins.username}) = ${username.trim().toLowerCase()}`)
    .limit(1);
  return rows[0] ?? null;
}

export async function authenticate(username: string, password: string) {
  await ensureDefaultAdmin();
  const admin = await findAdminByUsername(username.trim());
  if (!admin) return null;
  return verifyPassword(password, admin.passwordHash) ? admin : null;
}

type Attempt = { count: number; resetAt: number };

const LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 1000 * 60 * 15;

const globalForAttempts = globalThis as typeof globalThis & {
  __bmsLoginAttempts?: Map<string, Attempt>;
};

const attempts = globalForAttempts.__bmsLoginAttempts ?? new Map<string, Attempt>();
globalForAttempts.__bmsLoginAttempts = attempts;

export function isLoginThrottled(ip: string): boolean {
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (entry.resetAt < Date.now()) {
    attempts.delete(ip);
    return false;
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

export function registerLoginFailure(ip: string): void {
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < Date.now()) {
    attempts.set(ip, { count: 1, resetAt: Date.now() + LOGIN_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

export function clearLoginFailures(ip: string): void {
  attempts.delete(ip);
}

export function clientIp(request: Request): string {
  // x-real-ip est posé par l'inférence Vercel et n'est pas falsifiable par le client,
  // contrairement au premier élément de x-forwarded-for.
  const forwarded = request.headers.get("x-forwarded-for");
  const chain = forwarded?.split(",").map((v) => v.trim()).filter(Boolean);
  const last = chain?.[chain.length - 1];
  return request.headers.get("x-real-ip") || last || "unknown";
}

export function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: true,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}
