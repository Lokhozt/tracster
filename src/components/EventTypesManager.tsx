"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SectionFloatingAction } from "@/components/FloatingActionButton";
import { FormSheet } from "@/components/Sheet";
import {
  Button,
  Card,
  Field,
  FormActions,
  FormError,
  Input,
  ListRowButton,
  SETTINGS_LIST_CLASS,
} from "@/components/ui";
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

  const editing = eventTypes.find((type) => type.id === editingId && !type.immutable);

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
        <h2 className="max-lg:sr-only text-lg font-semibold">{t("eventTypes")}</h2>
        {/* Desktop button; phones and tablets use the floating "+" below. */}
        <span className="hidden shrink-0 lg:block">
          <Button type="button" onClick={createSheet.show}>
            {t("addType")}
          </Button>
        </span>
        <SectionFloatingAction sectionId="event-types" label={t("addType")} onClick={createSheet.show} />
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
      {/* Built-in types are fixed (lock); custom ones open their edit sheet. */}
      <ul className={SETTINGS_LIST_CLASS}>
        {eventTypes.map((type) => (
          <li key={type.id}>
            {type.immutable ? (
              <div className="flex min-h-12 items-center justify-between gap-3 px-3 py-2">
                <span className="font-medium">{type.name}</span>
                <span className="flex items-center gap-1 text-xs text-stone-500">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                  {t("builtIn")}
                </span>
              </div>
            ) : (
              <ListRowButton
                onClick={() => {
                  setEditingId(type.id);
                  setEditingName(type.name);
                  setRowError(null);
                }}
                actionLabel={t("rename")}
                disabled={savingId === type.id}
              >
                <span className="font-medium">{type.name}</span>
              </ListRowButton>
            )}
          </li>
        ))}
      </ul>
      <FormSheet open={editing !== undefined} onClose={() => setEditingId(null)} title={editing?.name ?? ""}>
        <form onSubmit={handleRename} className="space-y-4">
          <Field label={t("name")} htmlFor="edit-event-type-name">
            <Input
              id="edit-event-type-name"
              value={editingName}
              onChange={(event) => setEditingName(event.target.value)}
              required
            />
          </Field>
          <button
            type="button"
            onClick={() => editing && void handleDelete(editing)}
            disabled={savingId !== null}
            className="min-h-10 text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
          >
            {t("delete")}
          </button>
          <FormError>{rowError}</FormError>
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={savingId !== null || !editingName.trim()}>
              {savingId !== null ? t("saving") : t("save")}
            </Button>
          </FormActions>
        </form>
      </FormSheet>
    </Card>
  );
}
