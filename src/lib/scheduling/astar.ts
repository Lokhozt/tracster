import {
  mergeIntervals,
  overlapsAny,
  snapUpToSlot,
  subtractIntervals,
} from "@/lib/scheduling/intervals";
import { scoreSchedule, type InternalPlacement } from "@/lib/scheduling/score";
import type { IntervalMs, SchedulingCandidate, SchedulingProblem } from "@/lib/scheduling/types";

const SLOT_MS = 5 * 60 * 1000;
const MAX_EXPANSIONS = 12_000;
const MAX_OPEN = 300;
const MAX_STARTS_PER_ITEM = 48;
const CANDIDATE_COUNT = 3;

type SearchNode = {
  assigned: InternalPlacement[];
  nextIndex: number;
  score: number;
};

function itemOrder(problem: SchedulingProblem): number[] {
  return problem.items
    .map((_, index) => index)
    .sort((a, b) => {
      const itemA = problem.items[a];
      const itemB = problem.items[b];
      const locA = itemA.allowedLocationIds?.length ?? 99;
      const locB = itemB.allowedLocationIds?.length ?? 99;
      if (locA !== locB) {
        return locA - locB;
      }
      if (itemB.durationMs !== itemA.durationMs) {
        return itemB.durationMs - itemA.durationMs;
      }
      return a - b;
    });
}

/** Rest applies on both sides so an item placed earlier in time still keeps the gap. */
function withRest(placement: InternalPlacement, restMs: number): IntervalMs {
  return { start: placement.start - restMs, end: placement.end + restMs };
}

function locationOccupied(
  assigned: InternalPlacement[],
  locationId: string,
  restMs: number,
): IntervalMs[] {
  const blocked = assigned
    .filter((placement) => placement.locationId === locationId)
    .map((placement) => withRest(placement, restMs));
  return mergeIntervals(blocked);
}

function participantOccupied(
  problem: SchedulingProblem,
  assigned: InternalPlacement[],
  itemIndex: number,
): IntervalMs[] {
  const participantIds = new Set(
    problem.items[itemIndex].participants.map((person) => person.id),
  );

  if (participantIds.size === 0) {
    return [];
  }

  const blocked = assigned
    .filter((placement) =>
      problem.items[placement.itemIndex].participants.some((person) =>
        participantIds.has(person.id),
      ),
    )
    .map((placement) => withRest(placement, problem.restMs));

  return mergeIntervals(blocked);
}

function possibleStarts(free: IntervalMs, durationMs: number): number[] {
  const latest = free.end - durationMs;
  if (latest < free.start) {
    return [];
  }

  const starts: number[] = [];
  let cursor = snapUpToSlot(free.start, SLOT_MS);
  while (cursor <= latest) {
    starts.push(cursor);
    cursor += SLOT_MS;
  }

  if (starts.length <= MAX_STARTS_PER_ITEM) {
    return starts;
  }

  const step = Math.ceil(starts.length / MAX_STARTS_PER_ITEM);
  const sampled: number[] = [];
  for (let index = 0; index < starts.length; index += step) {
    sampled.push(starts[index]);
  }
  const last = starts[starts.length - 1];
  if (sampled[sampled.length - 1] !== last) {
    sampled.push(last);
  }
  return sampled;
}

function successorPlacements(
  problem: SchedulingProblem,
  assigned: InternalPlacement[],
  itemIndex: number,
): InternalPlacement[] {
  const item = problem.items[itemIndex];
  const allowed = new Set(item.allowedLocationIds ?? problem.windows.map((window) => window.locationId));
  const participantBlocked = participantOccupied(problem, assigned, itemIndex);
  const rested: InternalPlacement[] = [];
  const crowded: InternalPlacement[] = [];

  for (const window of problem.windows) {
    if (!allowed.has(window.locationId)) {
      continue;
    }

    const occupied = locationOccupied(assigned, window.locationId, problem.restMs);
    const freeSlots = subtractIntervals({ start: window.start, end: window.end }, occupied);
    const constrained =
      item.allowedWindows && item.allowedWindows.length > 0
        ? freeSlots.flatMap((free) =>
            item.allowedWindows!.flatMap((allowed) => {
              const start = Math.max(free.start, allowed.start);
              const end = Math.min(free.end, allowed.end);
              return end > start ? [{ start, end }] : [];
            }),
          )
        : freeSlots;
    const searchSlots = constrained.length > 0 ? constrained : freeSlots;

    for (const free of searchSlots) {
      for (const start of possibleStarts(free, item.durationMs)) {
        const placement = {
          itemIndex,
          locationId: window.locationId,
          start,
          end: start + item.durationMs,
        };
        const keepsRest = !overlapsAny({ start, end: placement.end }, participantBlocked);
        (keepsRest ? rested : crowded).push(placement);
      }
    }
  }

  return rested.length > 0 ? rested : crowded;
}

function fingerprint(assigned: InternalPlacement[]): string {
  return assigned
    .map((placement) => `${placement.itemIndex}:${placement.locationId}:${placement.start}`)
    .join("|");
}

function coarseFingerprint(assigned: InternalPlacement[]): string {
  return assigned
    .map(
      (placement) =>
        `${placement.itemIndex}:${placement.locationId}:${Math.floor(placement.start / (30 * 60 * 1000))}`,
    )
    .join("|");
}

function toCandidate(
  id: string,
  assigned: InternalPlacement[],
  problem: SchedulingProblem,
): SchedulingCandidate {
  const { score, caveats } = scoreSchedule(assigned, problem);
  const locationNames = new Map(problem.windows.map((window) => [window.locationId, window.locationName]));

  return {
    id,
    score,
    caveats: dedupeCaveats(caveats),
    placements: assigned
      .slice()
      .sort((a, b) => a.start - b.start)
      .map((placement) => {
        const item = problem.items[placement.itemIndex];
        return {
          itemId: item.id,
          choreographyId: item.choreographyId,
          choreographyTitle: item.choreographyTitle,
          groupId: item.groupId,
          groupName: item.groupName,
          locationId: placement.locationId,
          locationName: locationNames.get(placement.locationId) ?? "Location",
          startsAt: new Date(placement.start).toISOString(),
          endsAt: new Date(placement.end).toISOString(),
        };
      }),
  };
}

function dedupeCaveats(
  caveats: SchedulingCandidate["caveats"],
): SchedulingCandidate["caveats"] {
  const seen = new Set<string>();
  const unique: SchedulingCandidate["caveats"] = [];
  for (const caveat of caveats) {
    const key = `${caveat.kind}:${caveat.userId ?? ""}:${caveat.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(caveat);
  }
  return unique;
}

/** Best-first (A*) beam search: assign one rehearsal per layer, keep the highest-scoring partials. */
export function generateScheduleCandidates(problem: SchedulingProblem): SchedulingCandidate[] {
  if (problem.items.length === 0) {
    return [];
  }

  const order = itemOrder(problem);
  let layer: SearchNode[] = [{ assigned: [], nextIndex: 0, score: 0 }];
  let expansions = 0;

  for (let depth = 0; depth < order.length; depth += 1) {
    const itemIndex = order[depth];
    const nextLayer: SearchNode[] = [];

    for (const node of layer) {
      if (expansions >= MAX_EXPANSIONS) {
        break;
      }
      expansions += 1;
      const options = successorPlacements(problem, node.assigned, itemIndex);
      for (const placement of options) {
        const assigned = [...node.assigned, placement];
        const { score } = scoreSchedule(assigned, problem);
        nextLayer.push({
          assigned,
          nextIndex: depth + 1,
          score,
        });
      }
    }

    if (nextLayer.length === 0) {
      return [];
    }

    nextLayer.sort((a, b) => b.score - a.score);
    layer = nextLayer.slice(0, MAX_OPEN);
  }

  const foundKeys = new Set<string>();
  const unique: SearchNode[] = [];
  for (const node of layer.sort((a, b) => b.score - a.score)) {
    const key = coarseFingerprint(node.assigned);
    if (foundKeys.has(key)) {
      continue;
    }
    foundKeys.add(key);
    unique.push(node);
    if (unique.length >= CANDIDATE_COUNT) {
      break;
    }
  }

  if (unique.length < CANDIDATE_COUNT) {
    const seen = new Set(unique.map((node) => fingerprint(node.assigned)));
    for (const node of layer) {
      const key = fingerprint(node.assigned);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      unique.push(node);
      if (unique.length >= CANDIDATE_COUNT) {
        break;
      }
    }
  }

  return unique.map((node, index) => toCandidate(String(index + 1), node.assigned, problem));
}
