import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function requireApiUser() {
  const user = await getSessionUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Authentification requise." }, { status: 401 }),
    };
  }
  return { user, response: null as NextResponse | null };
}

export async function requireSuperAdmin() {
  const result = await requireApiUser();
  if (!result.user) return result;
  if (result.user.role !== "superadmin") {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Cette action est réservée au super administrateur." },
        { status: 403 },
      ),
    };
  }
  return result;
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
