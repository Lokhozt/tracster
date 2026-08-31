"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import type { SerializedGroup } from "@/lib/groups";

type MemberOption = { id: string; name: string; email: string };

function GroupMemberCheckboxes({
  members,
  selectedMemberIds,
  onChange,
}: {
  members: MemberOption[];
  selectedMemberIds: string[];
  onChange: (memberIds: string[]) => void;
}) {
  function toggleMember(memberId: string) {
    if (selectedMemberIds.includes(memberId)) {
      onChange(selectedMemberIds.filter((id) => id !== memberId));
      return;
    }

    onChange([...selectedMemberIds, memberId]);
  }

  if (members.length === 0) {
    return <p className="text-sm text-stone-500">Add participants before creating groups.</p>;
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <label
          key={member.id}
          className="flex cursor-pointer items-start gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50"
        >
          <input
            type="checkbox"
            checked={selectedMemberIds.includes(member.id)}
            onChange={() => toggleMember(member.id)}
            className="mt-0.5 rounded border-stone-300"
          />
          <span className="font-medium text-stone-900">{member.name}</span>
        </label>
      ))}
    </div>
  );
}

function CreateGroupForm({
  choreographyId,
  members,
  onSuccess,
  onCancel,
}: {
  choreographyId: string;
  members: MemberOption[];
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/choreographies/${choreographyId}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        memberIds: selectedMemberIds,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to create group.");
      return;
    }

    setName("");
    setSelectedMemberIds([]);
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="group-name">Group name</Label>
        <Input
          id="group-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Group A"
          required
        />
      </div>
      <div>
        <Label>Members</Label>
        <div className="mt-2">
          <GroupMemberCheckboxes
            members={members}
            selectedMemberIds={selectedMemberIds}
            onChange={setSelectedMemberIds}
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading || !name.trim() || selectedMemberIds.length === 0}>
          {loading ? "Creating..." : "Create group"}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function EditGroupForm({
  choreographyId,
  group,
  members,
  onSuccess,
  onCancel,
}: {
  choreographyId: string;
  group: SerializedGroup;
  members: MemberOption[];
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [selectedMemberIds, setSelectedMemberIds] = useState(
    group.members.map((member) => member.id),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(
      `/api/choreographies/${choreographyId}/groups/${group.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          memberIds: selectedMemberIds,
        }),
      },
    );

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to update group.");
      return;
    }

    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor={`group-name-${group.id}`}>Group name</Label>
        <Input
          id={`group-name-${group.id}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div>
        <Label>Members</Label>
        <div className="mt-2">
          <GroupMemberCheckboxes
            members={members}
            selectedMemberIds={selectedMemberIds}
            onChange={setSelectedMemberIds}
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading || !name.trim() || selectedMemberIds.length === 0}>
          {loading ? "Saving..." : "Save group"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DeleteGroupButton({
  choreographyId,
  groupId,
}: {
  choreographyId: string;
  groupId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (
      !window.confirm(
        "Delete this group? Existing rehearsals linked to it will target all participants instead.",
      )
    ) {
      return;
    }

    setLoading(true);

    const response = await fetch(
      `/api/choreographies/${choreographyId}/groups/${groupId}`,
      { method: "DELETE" },
    );

    setLoading(false);

    if (!response.ok) {
      return;
    }

    router.refresh();
  }

  return (
    <Button type="button" variant="ghost" disabled={loading} onClick={handleDelete}>
      {loading ? "Deleting..." : "Delete"}
    </Button>
  );
}

export function GroupsSection({
  choreographyId,
  canEdit,
  groups,
  members,
}: {
  choreographyId: string;
  canEdit: boolean;
  groups: SerializedGroup[];
  members: MemberOption[];
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Groups</h2>
          <p className="mt-1 text-sm text-stone-500">
            Optional participant groups with overlapping membership.
          </p>
        </div>
        {canEdit && !showCreateForm && members.length > 0 && (
          <Button type="button" onClick={() => setShowCreateForm(true)}>
            New group
          </Button>
        )}
      </div>

      {canEdit && showCreateForm && (
        <Card className="mb-6">
          <h3 className="mb-4 font-medium">Create group</h3>
          <CreateGroupForm
            choreographyId={choreographyId}
            members={members}
            onSuccess={() => setShowCreateForm(false)}
            onCancel={() => setShowCreateForm(false)}
          />
        </Card>
      )}

      {groups.length === 0 ? (
        <Card>
          <p className="text-stone-600">
            {canEdit
              ? "No groups yet. Create groups to schedule rehearsals for a subset of participants."
              : "No groups defined for this choreography."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <Card key={group.id}>
              {editingGroupId === group.id ? (
                <EditGroupForm
                  choreographyId={choreographyId}
                  group={group}
                  members={members}
                  onSuccess={() => setEditingGroupId(null)}
                  onCancel={() => setEditingGroupId(null)}
                />
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{group.name}</h3>
                    <p className="mt-2 text-sm text-stone-600">
                      {group.members.map((member) => member.name).join(", ") || "No members"}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setEditingGroupId(group.id)}
                      >
                        Edit
                      </Button>
                      <DeleteGroupButton
                        choreographyId={choreographyId}
                        groupId={group.id}
                      />
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export type GroupOption = {
  id: string;
  name: string;
  memberCount: number;
};

export function RehearsalAudienceSelect({
  groups,
  value,
  onChange,
}: {
  groups: GroupOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div>
      <Label htmlFor="rehearsal-audience">Participants</Label>
      <select
        id="rehearsal-audience"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base sm:text-sm"
      >
        <option value="">All participants</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name} ({group.memberCount}{" "}
            {group.memberCount === 1 ? "member" : "members"})
          </option>
        ))}
      </select>
    </div>
  );
}
