import { NextResponse } from "next/server";
import { fail, requireApiUser } from "@/lib/api-guard";
import { seedDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  const body = (await request.json().catch(() => ({}))) as { force?: boolean };
  try {
    const result = await seedDemoData(Boolean(body.force));
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return fail("Impossible de charger les données de démonstration.", 500);
  }
}
