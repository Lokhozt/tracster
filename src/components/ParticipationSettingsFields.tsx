"use client";

import type { ParticipationSettings } from "@/lib/participation";

export function ParticipationSettingsFields({
  value,
  onChange,
  idPrefix,
}: {
  value: ParticipationSettings;
  onChange: (value: ParticipationSettings) => void;
  idPrefix: string;
}) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-stone-200 p-4">
      <legend className="px-1 text-sm font-medium text-stone-700">
        Participation
      </legend>
      <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-700">
        <input
          id={`${idPrefix}-allow-join`}
          type="checkbox"
          checked={value.allowParticipantJoin}
          onChange={(event) =>
            onChange({
              ...value,
              allowParticipantJoin: event.target.checked,
              allowJoinRequests: event.target.checked
                ? false
                : value.allowJoinRequests,
            })
          }
          className="mt-0.5 rounded border-stone-300"
        />
        <span>
          <span className="font-medium">Allow participants to join</span>
          <span className="mt-0.5 block text-stone-500">
            Anyone who can see this can become a participant with one click.
          </span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-700">
        <input
          id={`${idPrefix}-allow-request`}
          type="checkbox"
          checked={value.allowJoinRequests}
          onChange={(event) =>
            onChange({
              ...value,
              allowJoinRequests: event.target.checked,
              allowParticipantJoin: event.target.checked
                ? false
                : value.allowParticipantJoin,
            })
          }
          className="mt-0.5 rounded border-stone-300"
        />
        <span>
          <span className="font-medium">Allow participants to request in</span>
          <span className="mt-0.5 block text-stone-500">
            Requests appear in a list you can accept or decline. Cannot be combined
            with free join.
          </span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-700">
        <input
          id={`${idPrefix}-hide`}
          type="checkbox"
          checked={value.hideFromNonParticipants}
          onChange={(event) =>
            onChange({
              ...value,
              hideFromNonParticipants: event.target.checked,
            })
          }
          className="mt-0.5 rounded border-stone-300"
        />
        <span>
          <span className="font-medium">Hide from non-participants</span>
          <span className="mt-0.5 block text-stone-500">
            People who are not participants will not see this in lists or on the
            schedule.
          </span>
        </span>
      </label>
    </fieldset>
  );
}
