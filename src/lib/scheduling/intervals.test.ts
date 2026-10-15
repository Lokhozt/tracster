import assert from "node:assert/strict";
import test from "node:test";
import { localMinutesInDay } from "@/lib/scheduling/intervals";

test("localMinutesInDay matches wall clock on DST fallback day", () => {
  const day = new Date(2026, 9, 25);
  const atTen = new Date(2026, 9, 25, 10, 0);
  assert.equal(localMinutesInDay(atTen, day), 10 * 60);
});
