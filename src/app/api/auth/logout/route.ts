import { NextResponse } from "next/server";
import { getSessionUser, sessionCookieOptions } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/constants";
import { isTrustedOrigin } from "@/lib/api-guard";
import { logActivity } from "@/lib/logs";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await isTrustedOrigin())) {
    return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  }
  const user = await getSessionUser();
  if (user) {
    await logActivity({
      action: "logout",
      details: `Déconnexion de ${user.displayName}`,
      actor: user.username,
    });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
