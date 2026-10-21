import { NextResponse } from "next/server";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { fail, requireApiUser } from "@/lib/api-guard";
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
  const { user, response } = await requireApiUser();
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
    if (!username || password.length < 6) {
      return fail("Identifiant requis et mot de passe d'au moins 6 caractères.");
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
