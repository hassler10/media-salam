import { NextResponse } from "next/server";
import { ensureDefaultAdmin, getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDefaultAdmin();
  } catch (error) {
    console.error("Initialisation :", error);
  }
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}
