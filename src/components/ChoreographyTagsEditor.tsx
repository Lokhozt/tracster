"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TagBubble } from "@/components/TagBubbles";
import type { TagRecord } from "@/lib/tags";

export function ChoreographyTagsEditor({
  choreographyId,
  allTags,
  assignedTags,
  canEdit,
  visible,
}: {
  choreographyId: string;
  allTags: TagRecord[];
  assignedTags: TagRecord[];
  canEdit: boolean;
  visible: boolean;
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState(() => assignedTags.map((tag) => tag.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!visible && !canEdit) {
    return null;
  }

  if (!canEdit) {
    if (assignedTags.length === 0) {
      return null;
    }
    return <TagList tags={assignedTags} />;
  }

  async function toggle(tagId: string) {
    if (saving) {
      return;
    }

    const previous = selectedIds;
    const next = selectedIds.includes(tagId)
      ? selectedIds.filter((id) => id !== tagId)
      : [...selectedIds, tagId];

    setSelectedIds(next);
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/choreographies/${choreographyId}/tags`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagIds: next }),
    });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setSelectedIds(previous);
      setError(data.error ?? t("choreographyTagsSaveError"));
      return;
    }

    router.refresh();
  }

  if (allTags.length === 0) {
    return <p className="text-sm text-stone-600">{t("noTagsDefined")}</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => {
          const selected = selectedIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              aria-pressed={selected}
              disabled={saving}
              onClick={() => void toggle(tag.id)}
              className="rounded-full transition hover:brightness-95 disabled:opacity-50"
            >
              <TagBubble tag={tag} selected={selected} />
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function TagList({ tags }: { tags: TagRecord[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li key={tag.id}>
          <TagBubble tag={tag} />
        </li>
      ))}
    </ul>
  );
}
