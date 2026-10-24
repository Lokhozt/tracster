import assert from "node:assert/strict";
import test from "node:test";
import { placementHistoryReducer } from "@/lib/scheduling/placement-history";
import type { SchedulePlacement } from "@/lib/scheduling/types";

function placement(itemId: string, startsAt: string): SchedulePlacement {
  return {
    itemId,
    choreographyId: "c1",
    choreographyTitle: "Piece",
    groupId: null,
    groupName: null,
    locationId: "loc",
    locationName: "Hall",
    startsAt,
    endsAt: "2026-10-17T11:00:00.000Z",
    choreographerNames: [],
    choreographerIds: [],
    participantNames: [],
    participantIds: [],
  };
}

test("undo and redo restore schedule edits", () => {
  const initial = [placement("a", "2026-10-17T10:00:00.000Z")];
  let state = placementHistoryReducer(
    { past: [], present: initial, future: [] },
    { type: "commit", placements: [placement("a", "2026-10-17T12:00:00.000Z")] },
  );
  assert.equal(state.present[0].startsAt, "2026-10-17T12:00:00.000Z");
  state = placementHistoryReducer(state, { type: "undo" });
  assert.equal(state.present[0].startsAt, "2026-10-17T10:00:00.000Z");
  state = placementHistoryReducer(state, { type: "redo" });
  assert.equal(state.present[0].startsAt, "2026-10-17T12:00:00.000Z");
});
