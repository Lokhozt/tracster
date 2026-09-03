"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { ParticipationSettingsFields } from "@/components/ParticipationSettingsFields";
import {
  defaultParticipationSettings,
  type ParticipationSettings,
} from "@/lib/participation";

export function CreateChoreographyForm() {
  const t = useTranslations("Components");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [participation, setParticipation] = useState<ParticipationSettings>(
    defaultParticipationSettings,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/choreographies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        description: formData.get("description") || undefined,
        ...participation,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? t("choreographyCreateError"));
      return;
    }

    router.push(`/choreographies/${data.choreography.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div>
        <Label htmlFor="title">{t("title")}</Label>
        <Input id="title" name="title" required placeholder={t("summerShowcasePlaceholder")} />
      </div>
      <div>
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          placeholder={t("optionalChoreographyNotes")}
        />
      </div>
      <ParticipationSettingsFields
        idPrefix="create-choreography"
        value={participation}
        onChange={setParticipation}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? t("creating") : t("createChoreography")}
      </Button>
    </form>
  );
}

export function EditChoreographyForm({
  choreography,
}: {
  choreography: {
    id: string;
    title: string;
    description: string | null;
    allowParticipantJoin: boolean;
    allowJoinRequests: boolean;
    hideFromNonParticipants: boolean;
  };
}) {
  const router = useRouter();
  const t = useTranslations("Components");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(choreography.title);
  const [description, setDescription] = useState(choreography.description ?? "");
  const [participation, setParticipation] = useState<ParticipationSettings>({
    allowParticipantJoin: choreography.allowParticipantJoin,
    allowJoinRequests: choreography.allowJoinRequests,
    hideFromNonParticipants: choreography.hideFromNonParticipants,
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/choreographies/${choreography.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        ...participation,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? t("choreographyUpdateError"));
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="edit-choreography-title">{t("title")}</Label>
        <Input
          id="edit-choreography-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="edit-choreography-description">{t("description")}</Label>
        <Textarea
          id="edit-choreography-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
        />
      </div>
      <ParticipationSettingsFields
        idPrefix="edit-choreography"
        value={participation}
        onChange={setParticipation}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? t("saving") : t("saveChanges")}
      </Button>
    </form>
  );
}
