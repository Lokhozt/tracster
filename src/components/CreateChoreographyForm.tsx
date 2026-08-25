"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { ParticipationSettingsFields } from "@/components/ParticipationSettingsFields";
import {
  defaultParticipationSettings,
  type ParticipationSettings,
} from "@/lib/participation";

export function CreateChoreographyForm() {
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
      setError(data.error ?? "Unable to create choreography.");
      return;
    }

    router.push(`/choreographies/${data.choreography.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required placeholder="Summer showcase" />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          placeholder="Optional notes about this choreography"
        />
      </div>
      <ParticipationSettingsFields
        idPrefix="create-choreography"
        value={participation}
        onChange={setParticipation}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create choreography"}
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
      setError(data.error ?? "Unable to update choreography.");
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="edit-choreography-title">Title</Label>
        <Input
          id="edit-choreography-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="edit-choreography-description">Description</Label>
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
        {loading ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
