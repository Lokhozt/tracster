import assert from "node:assert/strict";
import test from "node:test";

import { buildPartyBarSlots } from "@/lib/party-bar-shared";

test("buildPartyBarSlots pads to three slots", () => {
  assert.deepEqual(
    buildPartyBarSlots([{ userId: "a", name: "Alice" }]),
    [
      { userId: "a", name: "Alice" },
      null,
      null,
    ],
  );
});

test("buildPartyBarSlots caps at three participants", () => {
  const slots = buildPartyBarSlots([
    { userId: "a", name: "A" },
    { userId: "b", name: "B" },
    { userId: "c", name: "C" },
    { userId: "d", name: "D" },
  ]);
  assert.equal(slots.length, 3);
  assert.equal(slots[2]?.userId, "c");
});
