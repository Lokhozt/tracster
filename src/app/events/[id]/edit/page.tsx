import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { EditEventForm } from "@/components/EventForms";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditEvent, canViewEvent, serializeEvent } from "@/lib/events";
import { hasUpcomingSeriesEvents, loadSeriesSiblings } from "@/lib/event-series";
import { getEventTypes } from "@/lib/event-types";
import { listedLocationInclude } from "@/lib/locations";
import { canEditChoreography } from "@/lib/permissions";
import { canManageAllEvents } from "@/lib/roles";
import { getServerTranslator } from "@/i18n/server";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditEventPage({ params }: PageProps) {
  const [user, t, serverT] = await Promise.all([
    getCurrentUser(),
    getTranslations("Pages.EditEvent"),
    getServerTranslator(),
  ]);
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  if (!(await canViewEvent(id, user.id))) {
    notFound();
  }
  if (!(await canEditEvent(id, user.id))) {
    redirect(`/events/${id}`);
  }

  const [managesAllEvents, eventTypes, eventRecord, choreographyOptions] = await Promise.all([
    canManageAllEvents(user.id),
    getEventTypes(serverT),
    prisma.event.findUnique({
      where: { id },
      include: {
        ...listedLocationInclude,
        type: {
          select: { id: true, name: true, kind: true, immutable: true, sortOrder: true },
        },
        choreography: { select: { id: true, title: true } },
        group: { select: { id: true, name: true } },
        choreographies: {
          where: { choreography: { archivedAt: null } },
          include: {
            group: { select: { id: true, name: true } },
            choreography: { select: { id: true, title: true } },
          },
          orderBy: { choreography: { title: "asc" } },
        },
        participants: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    }),
    prisma.choreography.findMany({
      where: { archivedAt: null },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  if (!eventRecord) {
    notFound();
  }

  const event = serializeEvent(
    {
      ...eventRecord,
      hasUpcomingSeriesEvents: hasUpcomingSeriesEvents(
        eventRecord,
        await loadSeriesSiblings([eventRecord]),
      ),
    },
    serverT,
  );

  const editableChoreographies = managesAllEvents
    ? choreographyOptions
    : (
        await Promise.all(
          choreographyOptions.map(async (choreography) =>
            (await canEditChoreography(choreography.id, user.id)) ? choreography : null,
          ),
        )
      ).filter((item) => item !== null);

  return (
    <AppShell title={t("title")}>
      <div className="mb-6">
        <Link href={`/events/${id}`} className="text-sm text-stone-600 hover:text-stone-900">
          {t("backToEvent")}
        </Link>
      </div>
      <Card className="max-w-xl">
        <EditEventForm
          event={event}
          eventTypes={eventTypes}
          choreographyOptions={editableChoreographies}
        />
      </Card>
    </AppShell>
  );
}
