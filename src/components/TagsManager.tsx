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
  Label,
  ListRowButton,
  SETTINGS_LIST_CLASS,
  ToggleRow,
} from "@/components/ui";
import { useCreateSheet } from "@/lib/create-sheet";
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
  const createSheet = useCreateSheet("tag");
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
    createSheet.close();
    router.refresh();
  }

  const editing = tags.find((tag) => tag.id === editingId);

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
      <div className="mb-2 flex items-start justify-between gap-3">
        <h2 className="max-lg:sr-only text-lg font-semibold">{t("tags")}</h2>
        {/* Desktop button; phones and tablets use the floating "+" below. */}
        <span className="hidden shrink-0 lg:block">
          <Button type="button" onClick={createSheet.show}>
            {t("addTag")}
          </Button>
        </span>
        <SectionFloatingAction sectionId="tags" label={t("addTag")} onClick={createSheet.show} />
      </div>
      <p className="mb-4 text-sm text-stone-500">{t("tagsHelp")}</p>

      <div className="mb-6">
        <ToggleRow
          label={t("showChoreographyTags")}
          hint={t("showChoreographyTagsHelp")}
          checked={showTags}
          onChange={(checked) => void handleVisibilityChange(checked)}
          disabled={visibilitySaving}
        />
      </div>
      {visibilityError && <p className="mb-4 text-sm text-red-600">{visibilityError}</p>}

      <FormSheet open={createSheet.open} onClose={createSheet.close} title={t("addTag")}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label={t("name")} htmlFor="new-tag-name">
            <Input
              id="new-tag-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("tagPlaceholder")}
              required
            />
          </Field>
          <ColorField
            id="new-tag-color"
            label={t("tagColor")}
            value={color}
            onChange={setColor}
          />
          <FormError>{createError}</FormError>
          <FormActions>
            <Button type="button" variant="secondary" onClick={createSheet.close}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={creating || !name.trim()}>
              {creating ? t("adding") : t("addTag")}
            </Button>
          </FormActions>
        </form>
      </FormSheet>

      <div className="border-t border-stone-100 pt-4">
        {tags.length === 0 ? (
          <p className="text-sm text-stone-600">{t("noTags")}</p>
        ) : (
          <ul className={SETTINGS_LIST_CLASS}>
            {tags.map((tag) => (
              <li key={tag.id}>
                <ListRowButton
                  onClick={() => startEdit(tag)}
                  actionLabel={t("edit")}
                  disabled={savingId === tag.id}
                >
                  <TagBubble tag={tag} />
                </ListRowButton>
              </li>
            ))}
          </ul>
        )}
        {rowError && <p className="mt-3 text-sm text-red-600">{rowError}</p>}
      </div>
      {/* Rename, recolour or delete a tag, in the same sheet as every other form. */}
      <FormSheet open={editing !== undefined} onClose={() => setEditingId(null)} title={editing?.name ?? ""}>
        <form onSubmit={handleSave} className="space-y-4">
          <Field label={t("name")} htmlFor="edit-tag-name">
            <Input
              id="edit-tag-name"
              value={editingName}
              onChange={(event) => setEditingName(event.target.value)}
              required
            />
          </Field>
          <ColorField id="edit-tag-color" label={t("tagColor")} value={editingColor} onChange={setEditingColor} />
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
