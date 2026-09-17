import { formatUserName, type UserNameFields } from "@/lib/users";
import type { SerializedScheduleEvent } from "@/lib/schedule-filters";

export const BIRTHDAY_SCHEDULE_TYPE_ID = "birthday";
export const BIRTHDAY_EMOJI = "🎂";

const BIRTHDAY_START_HOUR = 8;
const BIRTHDAY_END_HOUR = 9;
const BIRTHDAY_YEAR_SPAN = 2;

type BirthdayUser = UserNameFields & {
  id: string;
  dateOfBirth: Date;
};

export function isBirthdayScheduleEvent(event: Pick<SerializedScheduleEvent, "typeId">) {
  return event.typeId === BIRTHDAY_SCHEDULE_TYPE_ID;
}

function birthdayOnYear(dateOfBirth: Date, year: number) {
  const month = dateOfBirth.getUTCMonth();
  const day = dateOfBirth.getUTCDate();
  const start = new Date(year, month, day, BIRTHDAY_START_HOUR, 0, 0, 0);
  if (start.getFullYear() !== year || start.getMonth() !== month || start.getDate() !== day) {
    return null;
  }
  const end = new Date(year, month, day, BIRTHDAY_END_HOUR, 0, 0, 0);
  return { start, end };
}

export function planningBirthdayEvents(
  users: BirthdayUser[],
  typeName: string,
  now = new Date(),
): SerializedScheduleEvent[] {
  const year = now.getFullYear();
  const years = Array.from(
    { length: BIRTHDAY_YEAR_SPAN * 2 + 1 },
    (_, index) => year - BIRTHDAY_YEAR_SPAN + index,
  );

  return users.flatMap((user) => {
    const name = formatUserName(user);
    return years.flatMap((occurrenceYear) => {
      const occurrence = birthdayOnYear(user.dateOfBirth, occurrenceYear);
      if (!occurrence) {
        return [];
      }
      return [
        {
          id: `birthday-${user.id}-${occurrenceYear}`,
          typeId: BIRTHDAY_SCHEDULE_TYPE_ID,
          typeName,
          typeKind: null,
          title: `${BIRTHDAY_EMOJI} ${name}`,
          startsAt: occurrence.start.toISOString(),
          endsAt: occurrence.end.toISOString(),
          location: null,
          choreographyId: null,
          choreographyTitle: null,
          participantNames: [name],
          isMember: false,
          isParticipating: true,
          isEventParticipant: true,
          allowParticipantJoin: false,
          allowJoinRequests: false,
          hasPendingJoinRequest: false,
          availabilityStatus: null,
          href: "",
          canEdit: false,
        } satisfies SerializedScheduleEvent,
      ];
    });
  });
}
