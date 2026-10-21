import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/constants";
import { logActivity } from "@/lib/logs";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getSessionUser();
  if (user) {
    await logActivity({
      action: "logout",
      details: `Déconnexion de ${user.displayName}`,
      actor: user.username,
    });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
