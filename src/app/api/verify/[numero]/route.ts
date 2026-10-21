import { NextResponse } from "next/server";
import { getSubscriberByNumber } from "@/lib/subscribers";
import { getStatus } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ numero: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { numero } = await ctx.params;
  const item = await getSubscriberByNumber(decodeURIComponent(numero));
  if (!item) {
    return NextResponse.json({ found: false }, { status: 404 });
  }
  return NextResponse.json({
    found: true,
    subscriber: {
      subscriptionNumber: item.subscriptionNumber,
      lastName: item.lastName,
      firstName: item.firstName,
      gender: item.gender,
      profession: item.profession,
      validityDate: item.validityDate,
      registrationDate: item.registrationDate,
      photoData: item.photoData,
      status: getStatus(item.validityDate),
    },
  });
}
