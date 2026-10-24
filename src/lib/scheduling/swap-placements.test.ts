import assert from "node:assert/strict";
import test from "node:test";
import {
  placementDurationMs,
  swapConflictPreviewSides,
  swappedPlacements,
} from "@/lib/scheduling/swap-placements";
import type { SchedulePlacement } from "@/lib/scheduling/types";

function placement(overrides: Partial<SchedulePlacement> & { itemId: string }): SchedulePlacement {
  return {
    choreographyId: "c1",
    choreographyTitle: "Piece",
    groupId: null,
    groupName: null,
    choreographerNames: [],
    choreographerIds: [],
    participantNames: [],
    participantIds: [],
    locationId: "loc-a",
    locationName: "Hall A",
    startsAt: "2026-10-17T10:00:00.000Z",
    endsAt: "2026-10-17T11:00:00.000Z",
    ...overrides,
  };
}

test("swappedPlacements exchanges slots when durations match", () => {
  const a = placement({
    itemId: "a",
    locationId: "loc-a",
    startsAt: "2026-10-17T10:00:00.000Z",
    endsAt: "2026-10-17T11:00:00.000Z",
  });
  const b = placement({
    itemId: "b",
    locationId: "loc-b",
    locationName: "Hall B",
    startsAt: "2026-10-17T14:00:00.000Z",
    endsAt: "2026-10-17T15:00:00.000Z",
  });
  const result = swappedPlacements([a, b], "a", "b");
  assert.ok(result);
  const nextA = result.find((entry) => entry.itemId === "a");
  const nextB = result.find((entry) => entry.itemId === "b");
  assert.equal(nextA?.locationId, "loc-b");
  assert.equal(nextA?.startsAt, b.startsAt);
  assert.equal(nextB?.locationId, "loc-a");
  assert.equal(nextB?.startsAt, a.startsAt);
});

test("swappedPlacements returns null when durations differ", () => {
  const a = placement({ itemId: "a", endsAt: "2026-10-17T11:00:00.000Z" });
  const b = placement({
    itemId: "b",
    endsAt: "2026-10-17T15:30:00.000Z",
    startsAt: "2026-10-17T14:00:00.000Z",
  });
  assert.equal(placementDurationMs(a), 60 * 60 * 1000);
  assert.notEqual(placementDurationMs(a), placementDurationMs(b));
  assert.equal(swappedPlacements([a, b], "a", "b"), null);
});

test("swapConflictPreviewSides maps conflicts per placement", () => {
  const selected = placement({ itemId: "a", choreographyTitle: "Alpha" });
  const hovered = placement({ itemId: "b", choreographyTitle: "Beta" });
  const sides = swapConflictPreviewSides(
    {
      a: {
        unavailable: ["Ada (1 / 2)"],
        engaged: [],
        choreographerUnavailable: [],
      },
      b: { unavailable: [], engaged: [], choreographerUnavailable: ["Bob"] },
    },
    selected,
    hovered,
    (key, values) => `${key}:${values?.names ?? ""}`,
  );
  assert.equal(sides.selected.title, "Alpha");
  assert.equal(sides.selected.constraints.length, 1);
  assert.equal(sides.hovered.constraints[0], "scheduleChoreographerUnavailable:Bob");
});
