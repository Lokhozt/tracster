import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui";
import {
  attendanceRate,
  formatRehearsalDurationMinutes,
  type ParticipantRehearsalStats,
} from "@/lib/rehearsal-statistics";
import { cn } from "@/lib/utils";

function rateBarClass(rate: number) {
  if (rate >= 80) {
    return "bg-emerald-500";
  }
  if (rate >= 50) {
    return "bg-amber-500";
  }
  return "bg-rose-400";
}

function rateTextClass(rate: number) {
  if (rate >= 80) {
    return "text-emerald-700";
  }
  if (rate >= 50) {
    return "text-amber-700";
  }
  return "text-rose-700";
}

export async function RehearsalStatisticsPanel({
  rehearsalCount,
  totalMinutes,
  participants,
  participantNames,
}: {
  rehearsalCount: number;
  totalMinutes: number;
  participants: ParticipantRehearsalStats[];
  participantNames: Map<string, string>;
}) {
  const t = await getTranslations("Pages.ChoreographyRehearsalStatistics");
  const { hours, minutes } = formatRehearsalDurationMinutes(totalMinutes);
  const durationLabel =
    hours > 0 && minutes > 0
      ? t("durationHoursMinutes", { hours, minutes })
      : hours > 0
        ? t("durationHours", { hours })
        : t("durationMinutes", { minutes });

  const ranked = [...participants].sort((left, right) => {
    const rateDiff =
      attendanceRate(right.attendedCount, right.eligibleCount) -
      attendanceRate(left.attendedCount, left.eligibleCount);
    if (rateDiff !== 0) {
      return rateDiff;
    }
    const nameLeft = participantNames.get(left.userId) ?? "";
    const nameRight = participantNames.get(right.userId) ?? "";
    return nameLeft.localeCompare(nameRight);
  });

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="relative overflow-hidden border-stone-200 bg-gradient-to-br from-white to-stone-50">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-stone-900/5" />
          <p className="text-sm font-medium uppercase tracking-wide text-stone-500">
            {t("rehearsalCountLabel")}
          </p>
          <p className="mt-2 text-4xl font-semibold tabular-nums text-stone-900">
            {rehearsalCount}
          </p>
        </Card>
        <Card className="relative overflow-hidden border-stone-200 bg-gradient-to-br from-white to-amber-50/60">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-500/10" />
          <p className="text-sm font-medium uppercase tracking-wide text-stone-500">
            {t("rehearsalHoursLabel")}
          </p>
          <p className="mt-2 text-4xl font-semibold tabular-nums text-stone-900">
            {durationLabel}
          </p>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-900">{t("participantAttendance")}</h2>

        {ranked.length === 0 ? (
          <Card>
            <p className="text-stone-600">{t("noParticipants")}</p>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <ul className="divide-y divide-stone-100">
              {ranked.map((participant) => {
                const name = participantNames.get(participant.userId) ?? t("unknownParticipant");
                const rate = attendanceRate(
                  participant.attendedCount,
                  participant.eligibleCount,
                );
                return (
                  <li
                    key={participant.userId}
                    className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-stone-900">{name}</p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className={cn("h-full rounded-full transition-all", rateBarClass(rate))}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1">
                      <p className="text-sm tabular-nums text-stone-600">
                        {t("attendanceFraction", {
                          attended: participant.attendedCount,
                          total: participant.eligibleCount,
                        })}
                      </p>
                      <p className={cn("text-sm font-semibold tabular-nums", rateTextClass(rate))}>
                        {t("attendanceRate", { rate })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
