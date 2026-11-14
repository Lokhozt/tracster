"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormSheet } from "@/components/Sheet";
import { Button, Card, Field, FormActions, FormError, Input } from "@/components/ui";
import { useCreateSheet } from "@/lib/create-sheet";
import type { SerializedEventType } from "@/lib/event-type-helpers";

export function EventTypesManager({ eventTypes }: { eventTypes: SerializedEventType[] }) {
  const t = useTranslations("Components");
  const router = useRouter();
  const createSheet = useCreateSheet("event-type");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);

    const response = await fetch("/api/event-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    setCreating(false);

    if (!response.ok) {
      setCreateError(data.error ?? t("eventTypeCreateError"));
      return;
    }

    setName("");
    createSheet.close();
    router.refresh();
  }

  async function handleRename(event: React.FormEvent) {
    event.preventDefault();
    if (!editingId) {
      return;
    }

    setSavingId(editingId);
    setRowError(null);

    const response = await fetch(`/api/event-types/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName }),
    });
    const data = await response.json();
    setSavingId(null);

    if (!response.ok) {
      setRowError(data.error ?? t("eventTypeRenameError"));
      return;
    }

    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(type: SerializedEventType) {
    if (!window.confirm(t("deleteNamedConfirm", {name: type.name}))) {
      return;
    }

    setSavingId(type.id);
    setRowError(null);

    const response = await fetch(`/api/event-types/${type.id}`, { method: "DELETE" });
    const data = await response.json();
    setSavingId(null);

    if (!response.ok) {
      setRowError(data.error ?? t("eventTypeDeleteError"));
      return;
    }

    router.refresh();
  }

  return (
    <Card className="max-w-xl">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("eventTypes")}</h2>
        <Button type="button" onClick={createSheet.show} className="shrink-0">
          {t("addType")}
        </Button>
      </div>
      <p className="mb-4 text-sm text-stone-500">
        {t("eventTypesHelp")}
      </p>
      <FormSheet open={createSheet.open} onClose={createSheet.close} title={t("addType")}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label={t("name")} htmlFor="event-type-name">
            <Input
              id="event-type-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("workshopPlaceholder")}
              required
            />
          </Field>
          <FormError>{createError}</FormError>
          <FormActions>
            <Button type="button" variant="secondary" onClick={createSheet.close}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={creating || !name.trim()}>
              {creating ? t("adding") : t("addType")}
            </Button>
          </FormActions>
        </form>
      </FormSheet>
      {rowError && <p className="mb-4 text-sm text-red-600">{rowError}</p>}
      <ul className="space-y-2">
        {eventTypes.map((type) => (
          <li
            key={type.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-100 px-3 py-2"
          >
            {editingId === type.id ? (
              <form onSubmit={handleRename} className="flex flex-1 flex-wrap items-center gap-2">
                <Input
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  className="max-w-xs"
                  required
                />
                <Button type="submit" disabled={savingId === type.id}>
                  {savingId === type.id ? t("saving") : t("save")}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                  {t("cancel")}
                </Button>
              </form>
            ) : (
              <>
                <div>
                  <p className="font-medium">{type.name}</p>
                  <p className="text-xs text-stone-500">
                    {type.immutable ? t("builtIn") : t("custom")}
                  </p>
                </div>
                {!type.immutable && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setEditingId(type.id);
                        setEditingName(type.name);
                        setRowError(null);
                      }}
                    >
                      {t("rename")}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={savingId === type.id}
                      onClick={() => void handleDelete(type)}
                    >
                      {t("delete")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
