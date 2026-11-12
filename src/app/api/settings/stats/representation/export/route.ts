import { NextRequest } from "next/server";
import { getServerLocale, getServerTranslator } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { canManageSettings } from "@/lib/roles";
import {
  buildRepresentationRosterPdf,
  loadRepresentationRoster,
  representationRosterFileName,
} from "@/lib/representation-roster";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }
  if (!(await canManageSettings(user.id))) {
    return forbidden();
  }

  const eventId = request.nextUrl.searchParams.get("eventId")?.trim();
  if (!eventId) {
    return jsonError("Representation is required.");
  }

  const roster = await loadRepresentationRoster(eventId);
  if (!roster) {
    return jsonError("Representation not found.");
  }

  const t = await getServerTranslator(user.displayLanguage);
  const locale = await getServerLocale(user.displayLanguage);
  const pdf = await buildRepresentationRosterPdf(
    roster,
    {
      choreographers: t("representationExport.choreographers"),
      participants: t("representationExport.participants"),
      none: t("representationExport.none"),
    },
    locale,
  );
  const fileName = representationRosterFileName(roster);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
