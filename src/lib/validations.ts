import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional(),
  dateOfBirth: z.string().date().optional(),
  password: z.string().min(8).max(100),
});

export const createUserSchema = registerSchema.extend({
  role: z.enum(["USER", "ADMIN"]).optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional(),
  dateOfBirth: z.string().date().nullable().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
});

export const transferOwnershipSchema = z.object({
  userId: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const choreographySchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  allowParticipantJoin: z.boolean().optional(),
  allowJoinRequests: z.boolean().optional(),
  hideFromNonParticipants: z.boolean().optional(),
}).superRefine((value, context) => {
  if (value.allowParticipantJoin && value.allowJoinRequests) {
    context.addIssue({
      code: "custom",
      message: "Participants cannot both join freely and request to join.",
    });
  }
});

export const choreographyLifecycleSchema = z.object({
  confirmUpcoming: z.boolean().optional(),
});

export const assignUserSchema = z.object({
  userId: z.string().min(1),
});

export const joinRequestDecisionSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["accept", "decline"]),
});

export const repetitionSchema = z.object({
  title: z.string().trim().max(120).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  location: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
  groupId: z.string().min(1).optional(),
});

export const repetitionConflictSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  groupId: z.string().min(1).optional(),
});

export const groupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  memberIds: z.array(z.string().min(1)).min(1),
});

export const unavailabilitySchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export const unavailabilityRangeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

export const availabilitySchema = z.object({
  status: z.enum(["AVAILABLE", "UNAVAILABLE", "MAYBE"]),
});

export const representationSchema = z.object({
  title: z.string().trim().max(120).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  location: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
  choreographyIds: z.array(z.string()).optional(),
});

export const linkRepresentationSchema = z.object({
  representationId: z.string().min(1),
});

export const linkChoreographySchema = z.object({
  choreographyId: z.string().min(1),
});

export const eventSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  location: z.string().trim().max(200).optional(),
  participantIds: z.array(z.string()).optional(),
  allowParticipantJoin: z.boolean().optional(),
  allowJoinRequests: z.boolean().optional(),
  hideFromNonParticipants: z.boolean().optional(),
}).superRefine((value, context) => {
  if (value.allowParticipantJoin && value.allowJoinRequests) {
    context.addIssue({
      code: "custom",
      message: "Participants cannot both join freely and request to join.",
    });
  }
});

export const choreographyRepresentationSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("create"),
    title: z.string().trim().max(120).optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime().optional(),
    location: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(1000).optional(),
  }),
  z.object({
    mode: z.literal("link"),
    representationId: z.string().min(1),
  }),
]);
