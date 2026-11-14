"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import type { LocationRecord } from "@/lib/locations";

export function LocationsManager({ locations }: { locations: LocationRecord[] }) {
  const t = useTranslations("Components");
  const router = useRouter();
  const createSheet = useCreateSheet("location");
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

    const response = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    setCreating(false);

    if (!response.ok) {
      setCreateError(data.error ?? t("locationCreateError"));
      return;
    }

    setName("");
    createSheet.close();
    router.refresh();
  }

  const editing = locations.find((location) => location.id === editingId);

  function startRename(location: LocationRecord) {
    setEditingId(location.id);
    setEditingName(location.name);
    setRowError(null);
  }

  async function handleRename(event: React.FormEvent) {
    event.preventDefault();
    if (!editingId) {
      return;
    }

    setSavingId(editingId);
    setRowError(null);

    const response = await fetch(`/api/locations/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName }),
    });
    const data = await response.json();
    setSavingId(null);

    if (!response.ok) {
      setRowError(data.error ?? t("locationRenameError"));
      return;
    }

    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(location: LocationRecord) {
    if (
      !window.confirm(t("locationDeleteConfirm", { name: location.name }))
    ) {
      return;
    }

    setSavingId(location.id);
    setRowError(null);

    const response = await fetch(`/api/locations/${location.id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    setSavingId(null);

    if (!response.ok) {
      setRowError(data.error ?? t("locationDeleteError"));
      return;
    }

    if (editingId === location.id) {
      setEditingId(null);
    }
    router.refresh();
  }

  return (
    <Card className="max-w-xl">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h2 className="max-lg:sr-only text-lg font-semibold">{t("locations")}</h2>
        <Button type="button" onClick={createSheet.show} className="shrink-0">
          {t("addLocation")}
        </Button>
      </div>
      <p className="mb-4 text-sm text-stone-500">
        {t("locationsHelp")} {t("locationsOneOffHint")}
      </p>

      <FormSheet open={createSheet.open} onClose={createSheet.close} title={t("addLocation")}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label={t("name")} htmlFor="new-location-name">
            <Input
              id="new-location-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("studioPlaceholder")}
              required
            />
          </Field>
          <FormError>{createError}</FormError>
          <FormActions>
            <Button type="button" variant="secondary" onClick={createSheet.close}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={creating || !name.trim()}>
              {creating ? t("adding") : t("addLocation")}
            </Button>
          </FormActions>
        </form>
      </FormSheet>

      <div className="border-t border-stone-100 pt-4">
        {locations.length === 0 ? (
          <p className="text-sm text-stone-600">{t("noLocations")}</p>
        ) : (
          <ul className={SETTINGS_LIST_CLASS}>
            {locations.map((location) => (
              <li key={location.id}>
                <ListRowButton
                  onClick={() => startRename(location)}
                  actionLabel={t("rename")}
                  disabled={savingId === location.id}
                >
                  <span className="font-medium">{location.name}</span>
                </ListRowButton>
              </li>
            ))}
          </ul>
        )}
        {rowError && <p className="mt-3 text-sm text-red-600">{rowError}</p>}
      </div>
      {/* Rename or delete a place, in the same sheet as every other form. */}
      <FormSheet open={editing !== undefined} onClose={() => setEditingId(null)} title={editing?.name ?? ""}>
        <form onSubmit={handleRename} className="space-y-4">
          <Field label={t("name")} htmlFor="edit-location-name">
            <Input
              id="edit-location-name"
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
