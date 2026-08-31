import { prisma } from "@/lib/db";
import { basicUserSelect, formatUserName } from "@/lib/users";

const groupInclude = {
  members: {
    include: { user: { select: basicUserSelect } },
    orderBy: [{ user: { lastName: "asc" as const } }, { user: { firstName: "asc" as const } }],
  },
};

type GroupWithMembers = Awaited<ReturnType<typeof getChoreographyGroups>>[number];

export type SerializedGroup = {
  id: string;
  name: string;
  members: { id: string; name: string; email: string }[];
};

export function serializeGroup(group: GroupWithMembers): SerializedGroup {
  return {
    id: group.id,
    name: group.name,
    members: group.members.map(({ user }) => ({
      id: user.id,
      name: formatUserName(user),
      email: user.email,
    })),
  };
}

export async function getChoreographyGroups(choreographyId: string) {
  return prisma.choreographyGroup.findMany({
    where: { choreographyId },
    include: groupInclude,
    orderBy: { name: "asc" },
  });
}

export async function validateGroupMemberIds(
  choreographyId: string,
  memberIds: string[],
): Promise<string | null> {
  const uniqueMemberIds = [...new Set(memberIds)];

  if (uniqueMemberIds.length === 0) {
    return "Select at least one participant.";
  }

  const members = await prisma.choreographyMember.findMany({
    where: {
      choreographyId,
      userId: { in: uniqueMemberIds },
    },
    select: { userId: true },
  });

  if (members.length !== uniqueMemberIds.length) {
    return "All group members must be participants of this choreography.";
  }

  return null;
}

export async function getGroupForChoreography(
  choreographyId: string,
  groupId: string,
) {
  return prisma.choreographyGroup.findFirst({
    where: { id: groupId, choreographyId },
    include: groupInclude,
  });
}

export type RehearsalAudience = {
  groupId: string | null;
  groupName: string | null;
  memberIds: string[];
};

export async function getRehearsalAudience(
  rehearsal: {
    choreographyId: string | null;
    groupId: string | null;
    group?: {
      name?: string;
      members: { userId: string }[];
    } | null;
  },
): Promise<RehearsalAudience> {
  if (rehearsal.group) {
    return {
      groupId: rehearsal.groupId,
      groupName: rehearsal.group.name ?? null,
      memberIds: rehearsal.group.members.map((member) => member.userId),
    };
  }

  if (rehearsal.groupId && rehearsal.choreographyId) {
    const group = await prisma.choreographyGroup.findFirst({
      where: { id: rehearsal.groupId, choreographyId: rehearsal.choreographyId },
      include: { members: { select: { userId: true } } },
    });

    if (group) {
      return {
        groupId: group.id,
        groupName: group.name,
        memberIds: group.members.map((member) => member.userId),
      };
    }
  }

  if (!rehearsal.choreographyId) {
    return {
      groupId: null,
      groupName: null,
      memberIds: [],
    };
  }

  const members = await prisma.choreographyMember.findMany({
    where: { choreographyId: rehearsal.choreographyId },
    select: { userId: true },
  });

  return {
    groupId: null,
    groupName: null,
    memberIds: members.map((member) => member.userId),
  };
}

export async function isRehearsalParticipant(
  rehearsal: {
    choreographyId: string | null;
    groupId: string | null;
    group?: {
      name?: string;
      members: { userId: string }[];
    } | null;
  },
  userId: string,
): Promise<boolean> {
  const audience = await getRehearsalAudience(rehearsal);
  return audience.memberIds.includes(userId);
}

export async function removeUserFromChoreographyGroups(
  choreographyId: string,
  userId: string,
): Promise<void> {
  const groups = await prisma.choreographyGroup.findMany({
    where: { choreographyId },
    select: { id: true },
  });

  if (groups.length === 0) {
    return;
  }

  await prisma.choreographyGroupMember.deleteMany({
    where: {
      userId,
      groupId: { in: groups.map((group) => group.id) },
    },
  });
}
