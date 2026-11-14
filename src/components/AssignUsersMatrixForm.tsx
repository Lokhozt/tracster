"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button, FormActions, FormError } from "@/components/ui";
import {
  UserSelectionMatrix,
  type AssignUserOption,
} from "@/components/UserSelectionMatrix";

async function readAssignError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return body?.error ?? fallback;
}

export function AssignUsersMatrixForm({
  users,
  assignedUserIds,
  assignUrl,
  label,
  submitLabel,
  errorFallbackKey = "assignParticipantError",
  buttonVariant = "primary",
  maxSelection,
  idPrefix = "assign-users",
  onDone,
  onCancel,
  hideLabel = false,
}: {
  users: AssignUserOption[];
  assignedUserIds: string[];
  assignUrl: string;
  label?: string;
  submitLabel?: string;
  errorFallbackKey?: string;
  buttonVariant?: "primary" | "secondary";
  maxSelection?: number;
  idPrefix?: string;
  /** Called after a successful add (e.g. to close the sheet it is in). */
  onDone?: () => void;
  /** Adds an "Annuler" button. */
  onCancel?: () => void;
  /** In a sheet titled the same: label for screen readers only. */
  hideLabel?: boolean;
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (selectedUserIds.length === 0) {
      return;
    }

    setLoading(true);
    setError(null);

    const fallback = t(errorFallbackKey);
    const results = await Promise.all(
      selectedUserIds.map(async (userId) => {
        const response = await fetch(assignUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        if (response.ok) {
          return null;
        }
        return readAssignError(response, fallback);
      }),
    );

    setLoading(false);
    const firstError = results.find((item) => item !== null);
    if (firstError) {
      setError(firstError);
      return;
    }

    setSelectedUserIds([]);
    router.refresh();
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <UserSelectionMatrix
        idPrefix={idPrefix}
        label={label ?? t("addParticipant")}
        users={users}
        selectedUserIds={selectedUserIds}
        onChange={setSelectedUserIds}
        excludedUserIds={assignedUserIds}
        maxSelection={maxSelection}
        hideLabel={hideLabel}
      />
      <FormError>{error}</FormError>
      <FormActions>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("cancel")}
          </Button>
        )}
        <Button type="submit" disabled={loading || selectedUserIds.length === 0} variant={buttonVariant}>
          {loading
            ? t("adding")
            : submitLabel ??
              (selectedUserIds.length > 1
                ? t("addParticipantsCount", { count: selectedUserIds.length })
                : label ?? t("addParticipant"))}
        </Button>
      </FormActions>
    </form>
  );
}
