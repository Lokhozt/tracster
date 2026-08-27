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

const locationFieldsSchema = {
  locationId: z.string().min(1).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
};

function refineExclusiveLocation(
  value: { locationId?: string | null; location?: string | null },
  context: z.RefinementCtx,
) {
  if (value.locationId && value.location) {
    context.addIssue({
      code: "custom",
      message: "Choose a listed location or a unique location, not both.",
    });
  }
}

export const locationSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

export const siteSettingsSchema = z.object({
  allowUserCreateChoreographies: z.boolean(),
  allowUserCreateEvents: z.boolean(),
  startOfDayHour: z.number().int().min(0).max(23),
});

export const repetitionSchema = z.object({
  title: z.string().trim().max(120).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  ...locationFieldsSchema,
  notes: z.string().trim().max(1000).optional(),
  groupId: z.string().min(1).optional(),
}).superRefine(refineExclusiveLocation);

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
  ...locationFieldsSchema,
  notes: z.string().trim().max(1000).optional(),
  choreographyIds: z.array(z.string()).optional(),
}).superRefine(refineExclusiveLocation);

export const linkRepresentationSchema = z.object({
  representationId: z.string().min(1),
});

export const linkChoreographySchema = z.object({
  choreographyId: z.string().min(1),
});

export const eventTypeSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const eventSchema = z.object({
  typeId: z.string().min(1),
  title: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(1000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  ...locationFieldsSchema,
  participantIds: z.array(z.string()).optional(),
  choreographyId: z.string().min(1).nullable().optional(),
  choreographyIds: z.array(z.string()).optional(),
  groupId: z.string().min(1).nullable().optional(),
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
  refineExclusiveLocation(value, context);
});

const schedulingWindowSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export const schedulingItemSchema = z.object({
  id: z.string().min(1).max(80),
  choreographyId: z.string().min(1),
  groupId: z.string().min(1).nullable().optional(),
  durationMinutes: z.number().int().min(15).max(12 * 60),
  allowedLocationIds: z.array(z.string().min(1)).default([]),
  allowedWindows: z.array(schedulingWindowSchema).default([]),
});

export const schedulingRequestSchema = z.object({
  items: z.array(schedulingItemSchema).min(1).max(40),
  days: z.array(z.string().date()).min(1).max(14),
  locationIds: z.array(z.string().min(1)).min(1).max(20),
  locationWindows: z.array(
    z.object({
      locationId: z.string().min(1),
      day: z.string().date(),
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
    }),
  ).min(1),
  restMinutes: z.number().int().min(0).max(180),
});

export const schedulingApplySchema = z.object({
  placements: z.array(
    z.object({
      choreographyId: z.string().min(1),
      groupId: z.string().min(1).nullable().optional(),
      locationId: z.string().min(1),
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
    }),
  ).min(1).max(40),
});

export const choreographyRepresentationSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("create"),
    title: z.string().trim().max(120).optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime().optional(),
    ...locationFieldsSchema,
    notes: z.string().trim().max(1000).optional(),
  }).superRefine(refineExclusiveLocation),
  z.object({
    mode: z.literal("link"),
    representationId: z.string().min(1),
  }),
]);
