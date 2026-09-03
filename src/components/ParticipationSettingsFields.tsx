"use client";

import { useTranslations } from "next-intl";

import type { ParticipationSettings } from "@/lib/participation";

type ParticipationMode = "managed" | "join" | "request";

function participationMode(value: ParticipationSettings): ParticipationMode {
  if (value.allowParticipantJoin) {
    return "join";
  }
  if (value.allowJoinRequests) {
    return "request";
  }
  return "managed";
}

function applyMode(
  value: ParticipationSettings,
  mode: ParticipationMode,
): ParticipationSettings {
  return {
    ...value,
    allowParticipantJoin: mode === "join",
    allowJoinRequests: mode === "request",
  };
}

function HideFromNonParticipantsField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: ParticipationSettings;
  onChange: (value: ParticipationSettings) => void;
}) {
  const t = useTranslations("Components");
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-700">
      <input
        id={id}
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
        <span className="font-medium">{t("hideNonParticipants")}</span>
        <span className="mt-0.5 block text-stone-500">
          {t("hideNonParticipantsHelp")}
        </span>
      </span>
    </label>
  );
}

export function ParticipationSettingsFields({
  value,
  onChange,
  idPrefix,
  variant = "choreography",
}: {
  value: ParticipationSettings;
  onChange: (value: ParticipationSettings) => void;
  idPrefix: string;
  variant?: "event" | "choreography";
}) {
  const t = useTranslations("Components");
  const mode = participationMode(value);

  if (variant === "event") {
    return (
      <div className="space-y-4">
        <fieldset className="space-y-3 rounded-lg border border-stone-200 p-4">
          <legend className="px-1 text-sm font-medium text-stone-700">
            {t("visibility")}
          </legend>
          <HideFromNonParticipantsField
            id={`${idPrefix}-hide`}
            value={value}
            onChange={onChange}
          />
        </fieldset>
        <fieldset className="space-y-3 rounded-lg border border-stone-200 p-4">
          <legend className="px-1 text-sm font-medium text-stone-700">
            {t("participation")}
          </legend>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-700">
            <input
              id={`${idPrefix}-mode-managed`}
              type="radio"
              name={`${idPrefix}-participation-mode`}
              checked={mode === "managed"}
              onChange={() => onChange(applyMode(value, "managed"))}
              className="mt-0.5 border-stone-300"
            />
            <span>
              <span className="font-medium">{t("managedByChoreographer")}</span>
              <span className="mt-0.5 block text-stone-500">
                {t("managedHelp")}
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-700">
            <input
              id={`${idPrefix}-mode-join`}
              type="radio"
              name={`${idPrefix}-participation-mode`}
              checked={mode === "join"}
              onChange={() => onChange(applyMode(value, "join"))}
              className="mt-0.5 border-stone-300"
            />
            <span>
              <span className="font-medium">{t("allowParticipantsJoin")}</span>
              <span className="mt-0.5 block text-stone-500">
                {t("joinHelp")}
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-700">
            <input
              id={`${idPrefix}-mode-request`}
              type="radio"
              name={`${idPrefix}-participation-mode`}
              checked={mode === "request"}
              onChange={() => onChange(applyMode(value, "request"))}
              className="mt-0.5 border-stone-300"
            />
            <span>
              <span className="font-medium">{t("allowRequests")}</span>
              <span className="mt-0.5 block text-stone-500">
                {t("requestsHelp")}
              </span>
            </span>
          </label>
        </fieldset>
      </div>
    );
  }

  return (
    <fieldset className="space-y-3 rounded-lg border border-stone-200 p-4">
      <legend className="px-1 text-sm font-medium text-stone-700">
        {t("participation")}
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
          <span className="font-medium">{t("allowParticipantsJoin")}</span>
          <span className="mt-0.5 block text-stone-500">
            {t("joinHelp")}
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
          <span className="font-medium">{t("allowRequests")}</span>
          <span className="mt-0.5 block text-stone-500">
            {t("requestsExclusiveHelp")}
          </span>
        </span>
      </label>
      <HideFromNonParticipantsField
        id={`${idPrefix}-hide`}
        value={value}
        onChange={onChange}
      />
    </fieldset>
  );
}
