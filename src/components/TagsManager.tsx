"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { TagBubble } from "@/components/TagBubbles";
import {
  DEFAULT_TAG_COLOR,
  TAG_COLOR_PRESETS,
  type TagRecord,
} from "@/lib/tags";
import type { SiteSettingsRecord } from "@/lib/site-settings";

export function TagsManager({
  tags,
  settings,
}: {
  tags: TagRecord[];
  settings: SiteSettingsRecord;
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_TAG_COLOR);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState(DEFAULT_TAG_COLOR);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [showTags, setShowTags] = useState(settings.showChoreographyTags);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);

    const response = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    const data = await response.json();
    setCreating(false);

    if (!response.ok) {
      setCreateError(data.error ?? t("tagCreateError"));
      return;
    }

    setName("");
    setColor(DEFAULT_TAG_COLOR);
    router.refresh();
  }

  function startEdit(tag: TagRecord) {
    setEditingId(tag.id);
    setEditingName(tag.name);
    setEditingColor(tag.color);
    setRowError(null);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!editingId) {
      return;
    }

    setSavingId(editingId);
    setRowError(null);

    const response = await fetch(`/api/tags/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName, color: editingColor }),
    });
    const data = await response.json();
    setSavingId(null);

    if (!response.ok) {
      setRowError(data.error ?? t("tagUpdateError"));
      return;
    }

    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(tag: TagRecord) {
    if (!window.confirm(t("deleteNamedConfirm", { name: tag.name }))) {
      return;
    }

    setSavingId(tag.id);
    setRowError(null);

    const response = await fetch(`/api/tags/${tag.id}`, { method: "DELETE" });
    const data = await response.json();
    setSavingId(null);

    if (!response.ok) {
      setRowError(data.error ?? t("tagDeleteError"));
      return;
    }

    if (editingId === tag.id) {
      setEditingId(null);
    }
    router.refresh();
  }

  async function handleVisibilityChange(checked: boolean) {
    setShowTags(checked);
    setVisibilitySaving(true);
    setVisibilityError(null);

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allowUserCreateChoreographies: settings.allowUserCreateChoreographies,
        allowUserCreateEvents: settings.allowUserCreateEvents,
        startOfDayHour: settings.startOfDayHour,
        showBirthdaysOnPlanning: settings.showBirthdaysOnPlanning,
        showChoreographyTags: checked,
      }),
    });
    const data = await response.json();
    setVisibilitySaving(false);

    if (!response.ok) {
      setShowTags(!checked);
      setVisibilityError(data.error ?? t("settingsSaveError"));
      return;
    }

    router.refresh();
  }

  return (
    <Card className="max-w-xl">
      <h2 className="mb-2 text-lg font-semibold">{t("tags")}</h2>
      <p className="mb-4 text-sm text-stone-500">{t("tagsHelp")}</p>

      <label className="mb-6 flex cursor-pointer items-start gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={showTags}
          onChange={(event) => void handleVisibilityChange(event.target.checked)}
          disabled={visibilitySaving}
          className="mt-0.5 rounded border-stone-300"
        />
        <span>
          <span className="font-medium">{t("showChoreographyTags")}</span>
          <span className="mt-0.5 block text-stone-500">
            {t("showChoreographyTagsHelp")}
          </span>
        </span>
      </label>
      {visibilityError && <p className="mb-4 text-sm text-red-600">{visibilityError}</p>}

      <form onSubmit={handleCreate} className="space-y-3">
        <div>
          <Label htmlFor="new-tag-name">{t("name")}</Label>
          <Input
            id="new-tag-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("tagPlaceholder")}
            required
          />
        </div>
        <ColorField
          id="new-tag-color"
          label={t("tagColor")}
          value={color}
          onChange={setColor}
        />
        {createError && <p className="text-sm text-red-600">{createError}</p>}
        <Button type="submit" disabled={creating || !name.trim()}>
          {creating ? t("adding") : t("addTag")}
        </Button>
      </form>

      <div className="mt-6 border-t border-stone-100 pt-4">
        {tags.length === 0 ? (
          <p className="text-sm text-stone-600">{t("noTags")}</p>
        ) : (
          <ul className="space-y-3">
            {tags.map((tag) => (
              <li key={tag.id} className="rounded-lg border border-stone-100 px-3 py-3">
                {editingId === tag.id ? (
                  <form onSubmit={handleSave} className="space-y-3">
                    <Input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      required
                      autoFocus
                    />
                    <ColorField
                      id={`edit-tag-color-${tag.id}`}
                      label={t("tagColor")}
                      value={editingColor}
                      onChange={setEditingColor}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" disabled={savingId === tag.id}>
                        {savingId === tag.id ? t("saving") : t("save")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setEditingId(null)}
                        disabled={savingId === tag.id}
                      >
                        {t("cancel")}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <TagBubble tag={tag} />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => startEdit(tag)}
                        disabled={savingId === tag.id}
                      >
                        {t("edit")}
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => void handleDelete(tag)}
                        disabled={savingId === tag.id}
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

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 cursor-pointer rounded border border-stone-300 bg-white p-1"
        />
        {TAG_COLOR_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-label={preset}
            onClick={() => onChange(preset)}
            className="size-7 rounded-full border border-stone-300"
            style={{ backgroundColor: preset }}
          />
        ))}
      </div>
    </div>
  );
}
