import { NextResponse } from "next/server";
import { fail, requireApiUser } from "@/lib/api-guard";
import { overLimit } from "@/lib/guard";
import { HEAVY_READ_LIMITS } from "@/lib/constants";
import { logActivity } from "@/lib/logs";
import { listSubscribers } from "@/lib/subscribers";
import { csvEscape } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  if (
    await overLimit(
      `csvExport:${user.username}`,
      HEAVY_READ_LIMITS.csvExport.max,
      HEAVY_READ_LIMITS.csvExport.windowMs,
    )
  ) {
    return fail("Trop d'exports à la suite. Réessayez dans une minute.", 429);
  }
  const items = await listSubscribers({ includePhoto: false });
  const header = [
    "numero",
    "nom",
    "prenoms",
    "sexe",
    "profession",
    "contact",
    "date_enregistrement",
    "date_validite",
    "notes",
  ];
  const lines = [
    header.join(","),
    ...items.map((s) =>
      [
        csvEscape(s.subscriptionNumber),
        csvEscape(s.lastName),
        csvEscape(s.firstName),
        csvEscape(s.gender),
        csvEscape(s.profession),
        csvEscape(s.phone),
        csvEscape(s.registrationDate),
        csvEscape(s.validityDate),
        csvEscape(s.notes),
      ].join(","),
    ),
  ];
  await logActivity({
    action: "csv_exported",
    details: `${items.length} abonnés exportés.`,
    actor: user.username,
  });
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="abonnes-bibliotheque-salam.csv"`,
    },
  });
}
