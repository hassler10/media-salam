import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { fail, requireApiUser } from "@/lib/api-guard";
import { findAdminByUsername, hashPassword, verifyPassword } from "@/lib/auth";
import { logActivity } from "@/lib/logs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  try {
    const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
    const currentPassword = body.currentPassword ?? "";
    const newPassword = body.newPassword ?? "";
    if (!currentPassword) {
      return fail("Mot de passe actuel requis.");
    }
    if (newPassword.length < 8) {
      return fail("Le nouveau mot de passe doit contenir au moins 8 caractères.");
    }
    if (newPassword === currentPassword) {
      return fail("Le nouveau mot de passe doit être différent de l'actuel.");
    }
    const admin = await findAdminByUsername(user.username);
    if (!admin || !verifyPassword(currentPassword, admin.passwordHash)) {
      return fail("Mot de passe actuel incorrect.", 403);
    }
    await db
      .update(admins)
      .set({ passwordHash: hashPassword(newPassword) })
      .where(eq(admins.id, admin.id));
    await logActivity({
      action: "password_changed",
      details: `Mot de passe du compte ${admin.username} modifié.`,
      actor: admin.username,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return fail("Impossible de modifier le mot de passe.", 500);
  }
}
