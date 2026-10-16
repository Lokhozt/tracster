import assert from "node:assert/strict";
import test from "node:test";
import { scoreSchedule, unavailableParticipantSignature } from "@/lib/scheduling/score";
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

test("an unavailable participant loses 10 plus four per missed rehearsal", () => {
  const participant = person({
    unavailability: [{ start: start - 1000, end: end + 1000 }],
  });
  const { score, caveats } = scoreSchedule(
    [{ itemIndex: 0, locationId: "loc", start, end }],
    problem(participant, start, end),
  );

  assert.equal(score, -22);
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

test("unavailable participants are keyed by choreography and ignore a fully blocked person", () => {
  const blocked = person({
    id: "blocked",
    name: "Bea",
    availableInPeriod: false,
    unavailability: [{ start: start - 1000, end: end + 1000 }],
  });
  const ada = person({
    unavailability: [{ start: start - 1000, end: end + 1000 }],
  });
  const built = problem(ada, start, end);
  built.items[0].participants = [blocked, ada];
  const again = problem(ada, start, end);
  again.items[0].choreographyId = "c2";

  assert.equal(
    unavailableParticipantSignature([{ itemIndex: 0, locationId: "loc", start, end }], built),
    "c1::u1",
  );
  assert.notEqual(
    unavailableParticipantSignature([{ itemIndex: 0, locationId: "loc", start, end }], built),
    unavailableParticipantSignature([{ itemIndex: 0, locationId: "loc", start, end }], again),
  );
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
