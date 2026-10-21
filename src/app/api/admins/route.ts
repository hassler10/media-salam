import { NextResponse } from "next/server";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { fail, requireApiUser, requireSuperAdmin } from "@/lib/api-guard";
import { hashPassword } from "@/lib/auth";
import { logActivity } from "@/lib/logs";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  const rows = await db
    .select({
      id: admins.id,
      username: admins.username,
      displayName: admins.displayName,
      role: admins.role,
      createdAt: admins.createdAt,
    })
    .from(admins);
  return NextResponse.json({
    items: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
  });
}

export async function POST(request: Request) {
  const { user, response } = await requireSuperAdmin();
  if (!user) return response;
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      displayName?: string;
    };
    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";
    const displayName = body.displayName?.trim() || username;
    if (!/^[A-Za-z0-9._-]{3,32}$/.test(username)) {
      return fail("Identifiant invalide (3 à 32 lettres, chiffres, point, tiret ou souligné).");
    }
    if (password.length < 8 || password.length > 128) {
      return fail("Mot de passe : entre 8 et 128 caractères.");
    }
    if (displayName.length > 80) {
      return fail("Nom affiché trop long (80 caractères maximum).");
    }
    const rows = await db
      .insert(admins)
      .values({
        username,
        passwordHash: hashPassword(password),
        displayName,
        role: "administrateur",
      })
      .returning({
        id: admins.id,
        username: admins.username,
        displayName: admins.displayName,
        role: admins.role,
      });
    await logActivity({
      action: "admin_created",
      details: `Compte ${username} créé.`,
      actor: user.username,
    });
    return NextResponse.json({ item: rows[0] }, { status: 201 });
  } catch {
    return fail("Impossible de créer ce compte (identifiant déjà utilisé ?).");
  }
}
