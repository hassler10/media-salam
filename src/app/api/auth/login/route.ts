import { NextResponse } from "next/server";
import { authenticate, sessionCookieOptions, signSession } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/constants";
import { logActivity } from "@/lib/logs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";
    if (!username || !password) {
      return NextResponse.json({ error: "Identifiant et mot de passe requis." }, { status: 400 });
    }
    const admin = await authenticate(username, password);
    if (!admin) {
      return NextResponse.json(
        { error: "Identifiants incorrects. Utilisez bibliothecaire / Salam2026." },
        { status: 401 },
      );
    }
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
      token,
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
    console.error(error);
    const message = error instanceof Error ? error.message : "Erreur interne lors de la connexion.";
    return NextResponse.json(
      { error: `Connexion impossible : ${message}` },
      { status: 500 },
    );
  }
}
