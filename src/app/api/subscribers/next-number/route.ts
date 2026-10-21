import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-guard";
import { peekNextSubscriptionNumber } from "@/lib/subscribers";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  const number = await peekNextSubscriptionNumber();
  return NextResponse.json({ number });
}
