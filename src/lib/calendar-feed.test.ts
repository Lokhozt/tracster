import assert from "node:assert/strict";
import test from "node:test";

import {
  buildIcsCalendar,
  feedSelectionQuery,
  parseFeedSelection,
  selectFeedEvents,
} from "@/lib/calendar-feed";
import type { SerializedScheduleEvent } from "@/lib/schedule-filters";

const NOW = new Date("2026-11-15T12:00:00Z");

function scheduleEvent(overrides: Partial<SerializedScheduleEvent>): SerializedScheduleEvent {
  return {
    id: "event",
    typeId: "type-rehearsal",
    typeName: "Répétition",
    typeKind: "REHEARSAL",
    title: null,
    startsAt: "2026-11-20T18:00:00Z",
    endsAt: "2026-11-20T19:30:00Z",
    location: null,
    choreographyId: null,
    choreographyTitle: null,
    groupName: null,
    participantNames: [],
    isMember: false,
    isParticipating: false,
    isEventParticipant: false,
    allowParticipantJoin: false,
    allowJoinRequests: false,
    hasPendingJoinRequest: false,
    isBarVolunteer: false,
    hasFreeBarSlot: false,
    barSlotsFilled: null,
    isChoreographer: false,
    hasUpcomingSeriesEvents: false,
    availabilityStatus: null,
    href: "/events/event",
    canEdit: false,
    ...overrides,
  };
}

test("parseFeedSelection defaults every type to mine", () => {
  assert.deepEqual(parseFeedSelection(new URLSearchParams(""), ["a", "b"]), { a: "mine", b: "mine" });
});

test("parseFeedSelection reads mine and all, other types are off", () => {
  const params = new URLSearchParams("mine=a&all=b");
  assert.deepEqual(parseFeedSelection(params, ["a", "b", "c"]), { a: "mine", b: "all", c: "off" });
});

test("feedSelectionQuery round-trips, and an empty choice stays empty", () => {
  const selection = { a: "mine", b: "all", c: "off" } as const;
  const query = feedSelectionQuery(selection);
  assert.equal(query, "mine=a&all=b");
  assert.deepEqual(parseFeedSelection(new URLSearchParams(query), ["a", "b", "c"]), selection);
  const none = feedSelectionQuery({ a: "off" });
  assert.deepEqual(parseFeedSelection(new URLSearchParams(none), ["a"]), { a: "off" });
});

test("selectFeedEvents: mine keeps own rehearsals not declined, all keeps every visible one", () => {
  const own = scheduleEvent({ id: "own", isMember: true, availabilityStatus: "AVAILABLE" });
  const declined = scheduleEvent({ id: "declined", isMember: true, availabilityStatus: "UNAVAILABLE" });
  const other = scheduleEvent({ id: "other" });
  const events = [own, declined, other];
  const ids = (selection: Record<string, "off" | "mine" | "all">) =>
    selectFeedEvents(events, selection, NOW).map((event) => event.id);
  assert.deepEqual(ids({ "type-rehearsal": "mine" }), ["own"]);
  assert.deepEqual(ids({ "type-rehearsal": "all" }), ["own", "declined", "other"]);
  assert.deepEqual(ids({ "type-rehearsal": "off" }), []);
});

test("selectFeedEvents: a bar slot puts a party on my agenda", () => {
  const party = scheduleEvent({ id: "party", typeId: "type-party", typeKind: "PARTY", isBarVolunteer: true });
  assert.deepEqual(
    selectFeedEvents([party], { "type-party": "mine" }, NOW).map((event) => event.id),
    ["party"],
  );
});

test("selectFeedEvents drops events that ended long ago", () => {
  const old = scheduleEvent({ startsAt: "2026-06-01T18:00:00Z", endsAt: "2026-06-01T19:00:00Z" });
  assert.equal(selectFeedEvents([old], { "type-rehearsal": "all" }, NOW).length, 0);
});

test("buildIcsCalendar writes UTC times, escapes text and folds long lines", () => {
  const ics = buildIcsCalendar({
    name: "Tracster",
    now: NOW,
    events: [
      {
        uid: "e1@example.com",
        start: new Date("2026-11-20T18:00:00Z"),
        end: new Date("2026-11-20T19:30:00Z"),
        summary: "Répétition · Show, part 1; final",
        location: "Studio A",
        description: `Line one\nLine two ${"é".repeat(60)}`,
      },
    ],
  });
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.ok(ics.includes("DTSTART:20261120T180000Z\r\n"));
  assert.ok(ics.includes("SUMMARY:Répétition · Show\\, part 1\\; final\r\n"));
  assert.ok(ics.includes("Line one\\nLine two"));
  const encoder = new TextEncoder();
  for (const line of ics.split("\r\n")) {
    assert.ok(encoder.encode(line).length <= 75, `line too long: ${line}`);
  }
});
