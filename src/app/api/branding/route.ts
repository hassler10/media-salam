import { NextResponse } from "next/server";
import { loadBranding } from "@/lib/branding-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const branding = await loadBranding();
    return NextResponse.json({ branding });
  } catch {
    return NextResponse.json({ branding: null });
  }
}
