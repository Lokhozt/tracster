import PDFDocument from "pdfkit";
import type { ServerLocale } from "@/i18n/server";
import { prisma } from "@/lib/db";
import {
  basicUserSelect,
  formatUserName,
  nestedUserNameOrderBy,
} from "@/lib/users";

export type RepresentationRosterChoreography = {
  title: string;
  choreographers: string[];
  participants: string[];
};

export type RepresentationRoster = {
  eventTitle: string;
  eventStartsAt: Date;
  choreographies: RepresentationRosterChoreography[];
};

export type RepresentationRosterPdfLabels = {
  choreographers: string;
  participants: string;
  none: string;
};

function stripEmojis(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\uFE0F/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function pdfDisplayName(name: string): string {
  return stripEmojis(name);
}

export async function loadRepresentationRoster(
  eventId: string,
): Promise<RepresentationRoster | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      title: true,
      startsAt: true,
      type: { select: { kind: true } },
      choreographies: {
        where: { choreography: { archivedAt: null } },
        select: {
          choreography: {
            select: {
              title: true,
              choreographers: {
                select: { user: { select: basicUserSelect } },
                orderBy: nestedUserNameOrderBy,
              },
              members: {
                select: { user: { select: basicUserSelect } },
                orderBy: nestedUserNameOrderBy,
              },
            },
          },
        },
        orderBy: { choreography: { title: "asc" } },
      },
    },
  });

  if (!event || event.type.kind !== "REPRESENTATION") {
    return null;
  }

  return {
    eventTitle: event.title,
    eventStartsAt: event.startsAt,
    choreographies: event.choreographies.map(({ choreography }) => ({
      title: choreography.title,
      choreographers: choreography.choreographers.map(({ user }) =>
        pdfDisplayName(formatUserName(user)),
      ),
      participants: choreography.members.map(({ user }) =>
        pdfDisplayName(formatUserName(user)),
      ),
    })),
  };
}

export function representationRosterFileName(roster: RepresentationRoster): string {
  const base =
    roster.eventTitle
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .slice(0, 48) || "representation";
  const day = roster.eventStartsAt.toISOString().slice(0, 10);
  return `${base}-roster-${day}.pdf`.replace(/["\\]/g, "_");
}

export async function buildRepresentationRosterPdf(
  roster: RepresentationRoster,
  labels: RepresentationRosterPdfLabels,
  locale: ServerLocale,
): Promise<Buffer> {
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "long" });

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const heading = roster.eventTitle.trim() || "Representation";
    doc.fontSize(18).font("Helvetica-Bold").text(heading, { align: "center" });
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(dateFormatter.format(roster.eventStartsAt), { align: "center" });
    doc.moveDown(1.5);

    for (const choreography of roster.choreographies) {
      if (doc.y > 700) {
        doc.addPage();
      }
      doc.fontSize(14).font("Helvetica-Bold").text(choreography.title);
      doc.moveDown(0.3);
      doc.fontSize(11).font("Helvetica");
      const choreographerLine =
        choreography.choreographers.length > 0
          ? choreography.choreographers.join(", ")
          : labels.none;
      const participantLine =
        choreography.participants.length > 0
          ? choreography.participants.join(", ")
          : labels.none;
      doc.text(`${labels.choreographers}: ${choreographerLine}`);
      doc.text(`${labels.participants}: ${participantLine}`);
      doc.moveDown(1);
    }

    doc.end();
  });
}
