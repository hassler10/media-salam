import { NextResponse } from "next/server";
import { loadBranding } from "@/lib/branding-server";
import { publicBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const branding = await loadBranding();
    return NextResponse.json(
      { branding: publicBranding(branding) },
      { headers: { "cache-control": "public, max-age=60" } },
    );
  } catch {
    return NextResponse.json({ branding: null });
  }
}
