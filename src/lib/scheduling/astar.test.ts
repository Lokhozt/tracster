import assert from "node:assert/strict";
import test from "node:test";
import { generateScheduleCandidates } from "@/lib/scheduling/astar";
import { atLocalTime, parseDayKey } from "@/lib/scheduling/intervals";
import { unavailableParticipantSignature } from "@/lib/scheduling/score";
import type { InternalPlacement } from "@/lib/scheduling/score";
import type { SchedulingProblem } from "@/lib/scheduling/types";

test("candidates with the same score and the same unavailable participants collapse", () => {
  const day = parseDayKey("2026-10-17");
  const start = atLocalTime(day, 9).getTime();
  const end = atLocalTime(day, 20).getTime();
  const problem: SchedulingProblem = {
    items: [
      {
        id: "item",
        index: 0,
        choreographyId: "c1",
        choreographyTitle: "Piece",
        groupId: null,
        groupName: null,
        durationMs: 60 * 60 * 1000,
        allowedLocationIds: null,
        allowedWindows: null,
        choreographers: [],
        participants: [
          {
            id: "u1",
            name: "Ada",
            availableInPeriod: true,
            attendance: { attended: 0, eligible: 0 },
            unavailability: [{ start, end: atLocalTime(day, 12).getTime() }],
          },
        ],
      },
    ],
    windows: ["hall", "studio"].map((locationId) => ({
      locationId,
      locationName: locationId,
      day: "2026-10-17",
      start,
      end,
    })),
    preferredLocationIds: [],
    restMs: 10 * 60 * 1000,
  };

  const candidates = generateScheduleCandidates(problem);
  const identities = candidates.map((candidate) => {
    const placements: InternalPlacement[] = candidate.placements.map((placement) => ({
      itemIndex: problem.items.findIndex((item) => item.id === placement.itemId),
      locationId: placement.locationId,
      start: new Date(placement.startsAt).getTime(),
      end: new Date(placement.endsAt).getTime(),
    }));
    return `${candidate.score}:${unavailableParticipantSignature(placements, problem)}`;
  });

  assert.equal(new Set(identities).size, identities.length);
  assert.ok(candidates.length > 1);
});
