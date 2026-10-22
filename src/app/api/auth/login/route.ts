import { NextResponse } from "next/server";
import {
  authenticate,
  clearLoginFailures,
  clientIp,
  isLoginThrottled,
  registerLoginFailure,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/constants";
import { isTrustedOrigin } from "@/lib/api-guard";
import { logActivity } from "@/lib/logs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = clientIp(request);
  try {
    if (!(await isTrustedOrigin())) {
      return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
    }
    if (isLoginThrottled(ip)) {
      return NextResponse.json(
        { error: "Trop de tentatives de connexion. Réessayez dans 15 minutes." },
        { status: 429, headers: { "Retry-After": "900" } },
      );
    }
    const body = (await request.json()) as { username?: string; password?: string };
    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";
    if (!username || !password) {
      return NextResponse.json({ error: "Identifiant et mot de passe requis." }, { status: 400 });
    }
    const admin = await authenticate(username, password);
    if (!admin) {
      registerLoginFailure(ip);
      return NextResponse.json(
        { error: "Identifiant ou mot de passe incorrect." },
        { status: 401 },
      );
    }
    clearLoginFailures(ip);
    const token = signSession({
      id: admin.id,
      username: admin.username,
      displayName: admin.displayName,
      role: admin.role,
    });
    try {
      await logActivity({
        action: "login",
        details: `Connexion de ${admin.displayName}`,
        actor: admin.username,
      });
    } catch {
      /* journal optionnel */
    }
    const response = NextResponse.json({
      ok: true,
      user: {
        id: admin.id,
        username: admin.username,
        displayName: admin.displayName,
        role: admin.role,
      },
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("Connexion :", error);
    return NextResponse.json(
      { error: "Connexion impossible pour le moment. Réessayez plus tard." },
      { status: 500 },
    );
  }
}
