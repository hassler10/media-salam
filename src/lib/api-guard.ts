import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionUser } from "@/lib/auth";

async function isTrustedOrigin(): Promise<boolean> {
  try {
    const store = await headers();
    const host = store.get("host");
    const forwardedHost = store.get("x-forwarded-host");
    const source = store.get("origin") ?? store.get("referer");
    if (!source || !host) return true;
    const sourceHost = new URL(source).host;
    return sourceHost === host || (!!forwardedHost && sourceHost === forwardedHost);
  } catch {
    return false;
  }
}

export async function requireApiUser() {
  if (!(await isTrustedOrigin())) {
    return {
      user: null,
      response: NextResponse.json({ error: "Origine non autorisée." }, { status: 403 }),
    };
  }
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
