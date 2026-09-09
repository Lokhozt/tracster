import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/datetime";
import { defaultEventTitle, serializeEventType } from "@/lib/event-type-helpers";
import { displayLocation, listedLocationInclude } from "@/lib/locations";
import { getServerTranslator } from "@/i18n/server";

type PageProps = { params: Promise<{ token: string }> };

export default async function SharedEventPage({ params }: PageProps) {
  const { token } = await params;
  const [locale, t, serverT] = await Promise.all([
    getLocale(),
    getTranslations("Pages.SharedEvent"),
    getServerTranslator(),
  ]);

  const event = await prisma.event.findUnique({
    where: { shareToken: token },
    include: {
      ...listedLocationInclude,
      type: {
        select: { id: true, name: true, kind: true, immutable: true, sortOrder: true },
      },
      choreography: { select: { title: true } },
      group: { select: { name: true } },
      choreographies: {
        select: { choreography: { select: { id: true, title: true } } },
        orderBy: { choreography: { title: "asc" } },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const type = serializeEventType(event.type, serverT);
  const title = defaultEventTitle(type, event.title);
  const location = displayLocation(event);

  return (
    <AppShell title={title}>
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-stone-500">
        {type.name}
      </p>

      <Card>
        <div className="grid gap-2 text-sm text-stone-600">
          <p>
            <span className="font-medium text-stone-900">{t("start")}:</span>{" "}
            {formatDateTime(event.startsAt, locale as "en" | "fr")}
          </p>
          {event.endsAt && (
            <p>
              <span className="font-medium text-stone-900">{t("end")}:</span>{" "}
              {formatDateTime(event.endsAt, locale as "en" | "fr")}
            </p>
          )}
          {location && (
            <p>
              <span className="font-medium text-stone-900">{t("location")}:</span>{" "}
              {location}
            </p>
          )}
          {event.choreography && (
            <p>
              <span className="font-medium text-stone-900">{t("choreography")}:</span>{" "}
              {event.choreography.title}
            </p>
          )}
          {event.group && (
            <p>
              <span className="font-medium text-stone-900">{t("group")}:</span>{" "}
              {event.group.name}
            </p>
          )}
          {event.description && (
            <p>
              <span className="font-medium text-stone-900">{t("description")}:</span>{" "}
              {event.description}
            </p>
          )}
          {event.choreographies.length > 0 && (
            <div>
              <p className="font-medium text-stone-900">{t("choreographies")}:</p>
              <ul className="mt-1 list-inside list-disc">
                {event.choreographies.map(({ choreography }) => (
                  <li key={choreography.id}>{choreography.title}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      <p className="mt-4 text-xs text-stone-500">{t("readOnly")}</p>
    </AppShell>
  );
}
