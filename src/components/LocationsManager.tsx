"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import type { LocationRecord } from "@/lib/locations";

export function LocationsManager({ locations }: { locations: LocationRecord[] }) {
  const t = useTranslations("Components");
  const router = useRouter();
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
    router.refresh();
  }

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
      !window.confirm(
        `Delete “${location.name}”? Existing rehearsals and events will keep this as a unique location.`,
      )
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
      <h2 className="mb-1 text-lg font-semibold">{t("locations")}</h2>
      <p className="mb-4 text-sm text-stone-500">
        {t("locationsHelp")}
        A unique location can still be entered when scheduling.
      </p>

      <form onSubmit={handleCreate} className="space-y-3">
        <div>
          <Label htmlFor="new-location-name">{t("name")}</Label>
          <Input
            id="new-location-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("studioPlaceholder")}
            required
          />
        </div>
        {createError && <p className="text-sm text-red-600">{createError}</p>}
        <Button type="submit" disabled={creating || !name.trim()}>
          {creating ? t("adding") : t("addLocation")}
        </Button>
      </form>

      <div className="mt-6 border-t border-stone-100 pt-4">
        {locations.length === 0 ? (
          <p className="text-sm text-stone-600">{t("noLocations")}</p>
        ) : (
          <ul className="space-y-3">
            {locations.map((location) => (
              <li
                key={location.id}
                className="rounded-lg border border-stone-100 px-3 py-3"
              >
                {editingId === location.id ? (
                  <form onSubmit={handleRename} className="space-y-3">
                    <Input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      required
                      autoFocus
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" disabled={savingId === location.id}>
                        {savingId === location.id ? t("saving") : t("save")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setEditingId(null)}
                        disabled={savingId === location.id}
                      >
                        {t("cancel")}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{location.name}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => startRename(location)}
                        disabled={savingId === location.id}
                      >
                        {t("rename")}
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => handleDelete(location)}
                        disabled={savingId === location.id}
                      >
                        {t("delete")}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {rowError && <p className="mt-3 text-sm text-red-600">{rowError}</p>}
      </div>
    </Card>
  );
}
