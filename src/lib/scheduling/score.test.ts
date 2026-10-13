import assert from "node:assert/strict";
import test from "node:test";
import { scoreSchedule } from "@/lib/scheduling/score";
import type { SchedulingPerson, SchedulingProblem } from "@/lib/scheduling/types";

function person(overrides: Partial<SchedulingPerson> = {}): SchedulingPerson {
  return {
    id: "u1",
    name: "Ada",
    unavailability: [],
    availableInPeriod: true,
    attendance: { attended: 2, eligible: 5 },
    ...overrides,
  };
}

function problem(participant: SchedulingPerson, start: number, end: number): SchedulingProblem {
  return {
    items: [
      {
        id: "item",
        index: 0,
        choreographyId: "c1",
        choreographyTitle: "Piece",
        groupId: null,
        groupName: null,
        durationMs: end - start,
        allowedLocationIds: null,
        allowedWindows: null,
        choreographers: [],
        participants: [participant],
      },
    ],
    windows: [
      {
        locationId: "loc",
        locationName: "Hall",
        day: "2026-10-17",
        start,
        end: start + 10 * 60 * 60 * 1000,
      },
    ],
    preferredLocationIds: [],
    restMs: 10 * 60 * 1000,
  };
}

const start = new Date(2026, 9, 17, 10, 0).getTime();
const end = start + 60 * 60 * 1000;

test("an unavailable participant loses 10 plus one per missed rehearsal", () => {
  const participant = person({
    unavailability: [{ start: start - 1000, end: end + 1000 }],
  });
  const { score, caveats } = scoreSchedule(
    [{ itemIndex: 0, locationId: "loc", start, end }],
    problem(participant, start, end),
  );

  assert.equal(score, -13);
  assert.equal(caveats[0]?.message, "Ada (2 / 5) is unavailable for Piece.");
});

test("missed rehearsals do not count when the participant can attend", () => {
  const { score, caveats } = scoreSchedule(
    [{ itemIndex: 0, locationId: "loc", start, end }],
    problem(person(), start, end),
  );

  assert.equal(score, 0);
  assert.equal(caveats.length, 0);
});

test("a participant unavailable for the whole period is ignored", () => {
  const participant = person({
    availableInPeriod: false,
    unavailability: [{ start: start - 1000, end: end + 1000 }],
    attendance: { attended: 0, eligible: 4 },
  });
  const { score, caveats } = scoreSchedule(
    [{ itemIndex: 0, locationId: "loc", start, end }],
    problem(participant, start, end),
  );

  assert.equal(score, 0);
  assert.equal(caveats.length, 0);
});
