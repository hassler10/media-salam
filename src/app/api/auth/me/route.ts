import { NextResponse } from "next/server";
import { ensureDefaultAdmin, getSessionUser } from "@/lib/auth";
import { seedDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDefaultAdmin();
    await seedDemoData(false);
  } catch (error) {
    console.error("Initialisation :", error);
  }
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}
