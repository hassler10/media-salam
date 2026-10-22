import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins, revokedSessions } from "@/db/schema";
import { bumpGuard, clearGuard, guardCount } from "@/lib/guard";
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
  /** Identifiant de la session, rayé à la déconnexion ou au changement de mot de passe. */
  jti: string;
  exp: number;
};

export type SessionClaims = SessionUser & { jti: string; exp: number };

export function signSession(user: SessionUser): string {
  if (!SECRET) {
    throw Object.assign(new Error("SESSION_SECRET absent : impossible de signer une session."), {
      status: 500,
    });
  }
  const payload: SessionPayload = {
    ...user,
    jti: randomBytes(12).toString("hex"),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function readSession(token: string | undefined | null): SessionClaims | null {
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
      jti: payload.jti,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

async function isRevoked(jti: string): Promise<boolean> {
  const rows = await db
    .select({ jti: revokedSessions.jti })
    .from(revokedSessions)
    .where(eq(revokedSessions.jti, jti))
    .limit(1);
  return rows.length > 0;
}

/** Raye la session portée par le cookie d'appel jusqu'à son expiration naturelle. */
export async function revokeCurrentSession(): Promise<void> {
  const store = await cookies();
  const claims = readSession(store.get(SESSION_COOKIE)?.value);
  if (!claims) return;
  await db
    .insert(revokedSessions)
    .values({
      jti: claims.jti,
      expiresAt: sql`now() + make_interval(secs => ${Math.max(1, Math.round((claims.exp - Date.now()) / 1000))})`,
    })
    .onConflictDoNothing();
  await db.delete(revokedSessions).where(sql`${revokedSessions.expiresAt} < now()`);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const tokenUser = readSession(store.get(SESSION_COOKIE)?.value);
  if (!tokenUser) return null;
  // La liste des sessions rayées vit en base : elle doit exister avant la lecture.
  await ensureSchema();
  if (await isRevoked(tokenUser.jti)) return null;
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

const LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 1000 * 60 * 15;

function loginKey(ip: string): string {
  return `login:${ip}`;
}

export async function isLoginThrottled(ip: string): Promise<boolean> {
  return (await guardCount(loginKey(ip), LOGIN_WINDOW_MS)) >= LOGIN_MAX_ATTEMPTS;
}

export async function registerLoginFailure(ip: string): Promise<void> {
  await bumpGuard(loginKey(ip), LOGIN_WINDOW_MS);
}

export async function clearLoginFailures(ip: string): Promise<void> {
  await clearGuard(loginKey(ip));
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
