import {
  localDayKey,
  mergeIntervals,
  overlapsAny,
  snapUpToSlot,
  subtractIntervals,
} from "@/lib/scheduling/intervals";
import {
  scorePlacementDelta,
  scoreSchedule,
  type InternalPlacement,
} from "@/lib/scheduling/score";
import type { ServerTranslator } from "@/i18n/server";
import type { IntervalMs, SchedulingCandidate, SchedulingProblem } from "@/lib/scheduling/types";

const englishSchedulingTranslator: ServerTranslator = (key) =>
  key === "resources.Location" ? "Location" : key;

const SLOT_MS = 5 * 60 * 1000;
const MAX_EXPANSIONS = 12_000;
const MAX_OPEN = 300;
const MAX_STARTS_PER_ITEM = 48;
const MAX_PLACEMENTS_PER_ITEM = 72;
const CANDIDATE_COUNT = 3;
const MAX_SIMILAR_PER_LAYER = 2;
/** How far a rehearsal must move before the plan counts as a different option. */
const DISTINCT_START_TOLERANCE_MS = 60 * 60 * 1000;

type SearchNode = {
  assigned: InternalPlacement[];
  score: number;
  locationBlocked: Map<string, IntervalMs[]>;
  participantBlocked: Map<string, IntervalMs[]>;
};

/**
 * Bookable time each item's choreographers are already blocked for. A choreographer
 * who can only attend part of the period narrows the item as surely as an explicit
 * constraint, so those items are placed while the calendar is still open.
 */
function choreographerPressure(problem: SchedulingProblem): number[] {
  const bookable = mergeIntervals(
    problem.windows.map((window) => ({ start: window.start, end: window.end })),
  );

  return problem.items.map((item) => {
    const blocked: IntervalMs[] = [];
    for (const choreographer of item.choreographers) {
      if (!choreographer.availableInPeriod) {
        continue;
      }
      blocked.push(...choreographer.unavailability);
    }

    let total = 0;
    for (const interval of mergeIntervals(blocked)) {
      for (const window of bookable) {
        total += Math.max(
          0,
          Math.min(interval.end, window.end) - Math.max(interval.start, window.start),
        );
      }
    }
    return total;
  });
}

function itemOrder(problem: SchedulingProblem): number[] {
  const participantDemand = new Map<string, number>();
  for (const item of problem.items) {
    for (const participant of item.participants) {
      participantDemand.set(
        participant.id,
        (participantDemand.get(participant.id) ?? 0) + 1,
      );
    }
  }
  const pressure = choreographerPressure(problem);

  return problem.items
    .map((_, index) => index)
    .sort((a, b) => {
      const itemA = problem.items[a];
      const itemB = problem.items[b];
      const domainA =
        (itemA.allowedLocationIds?.length ?? problem.windows.length) *
        (itemA.allowedWindows?.length ?? 1);
      const domainB =
        (itemB.allowedLocationIds?.length ?? problem.windows.length) *
        (itemB.allowedWindows?.length ?? 1);
      if (domainA !== domainB) {
        return domainA - domainB;
      }
      if (pressure[a] !== pressure[b]) {
        return pressure[b] - pressure[a];
      }
      const demandA = itemA.participants.reduce(
        (total, participant) => total + (participantDemand.get(participant.id) ?? 0),
        0,
      );
      const demandB = itemB.participants.reduce(
        (total, participant) => total + (participantDemand.get(participant.id) ?? 0),
        0,
      );
      if (demandA !== demandB) {
        return demandB - demandA;
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

function participantOccupied(
  problem: SchedulingProblem,
  participantBlocked: Map<string, IntervalMs[]>,
  itemIndex: number,
): IntervalMs[] {
  const blocked: IntervalMs[] = [];
  for (const participant of problem.items[itemIndex].participants) {
    blocked.push(...(participantBlocked.get(participant.id) ?? []));
  }
  return mergeIntervals(blocked);
}

function possibleStarts(
  free: IntervalMs,
  durationMs: number,
  preferredStarts: number[],
): number[] {
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

  // Keep starts that pack against another rehearsal or a meaningful time
  // boundary before filling the remaining quota with an even sample.
  const available = new Set(starts);
  const sampled: number[] = [];
  const selected = new Set<number>();
  for (const preferred of preferredStarts) {
    const snapped = snapUpToSlot(preferred, SLOT_MS);
    if (available.has(snapped) && !selected.has(snapped)) {
      sampled.push(snapped);
      selected.add(snapped);
      if (sampled.length >= MAX_STARTS_PER_ITEM) {
        return sampled;
      }
    }
  }

  const remaining = starts.filter((start) => !selected.has(start));
  const quota = MAX_STARTS_PER_ITEM - sampled.length;
  for (let index = 0; index < quota; index += 1) {
    const position =
      quota === 1
        ? 0
        : Math.round((index * (remaining.length - 1)) / (quota - 1));
    const start = remaining[position];
    if (start !== undefined && !selected.has(start)) {
      sampled.push(start);
      selected.add(start);
    }
  }
  return sampled;
}

function preferredStarts(
  problem: SchedulingProblem,
  assigned: InternalPlacement[],
  itemIndex: number,
  free: IntervalMs,
): number[] {
  const participantIds = new Set(
    problem.items[itemIndex].participants.map((participant) => participant.id),
  );
  const starts = [free.start, free.end - problem.items[itemIndex].durationMs];

  for (const placement of assigned) {
    if (
      problem.items[placement.itemIndex].participants.some((participant) =>
        participantIds.has(participant.id),
      )
    ) {
      starts.push(
        placement.end + problem.restMs,
        placement.start - problem.restMs - problem.items[itemIndex].durationMs,
      );
    }
  }

  const day = new Date(free.start);
  for (const [hour, minute] of [[12, 0], [12, 30], [14, 0]] as const) {
    const boundary = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      hour,
      minute,
    ).getTime();
    starts.push(boundary, boundary - problem.items[itemIndex].durationMs);
  }
  return starts;
}

function limitPlacements(placements: InternalPlacement[]): InternalPlacement[] {
  if (placements.length <= MAX_PLACEMENTS_PER_ITEM) {
    return placements;
  }

  // Round-robin across location/day domains so a large early window cannot
  // consume the complete value budget and erase otherwise viable alternatives.
  const groups = new Map<string, InternalPlacement[]>();
  for (const placement of placements) {
    const key = `${placement.locationId}:${localDayKey(new Date(placement.start))}`;
    const group = groups.get(key) ?? [];
    group.push(placement);
    groups.set(key, group);
  }

  const limited: InternalPlacement[] = [];
  let offset = 0;
  while (limited.length < MAX_PLACEMENTS_PER_ITEM) {
    let added = false;
    for (const group of groups.values()) {
      const placement = group[offset];
      if (placement) {
        limited.push(placement);
        added = true;
        if (limited.length >= MAX_PLACEMENTS_PER_ITEM) {
          break;
        }
      }
    }
    if (!added) {
      break;
    }
    offset += 1;
  }
  return limited;
}

function successorPlacements(
  problem: SchedulingProblem,
  node: SearchNode,
  itemIndex: number,
): InternalPlacement[] {
  const item = problem.items[itemIndex];
  const allowed = new Set(item.allowedLocationIds ?? problem.windows.map((window) => window.locationId));
  const participantBlocked = participantOccupied(
    problem,
    node.participantBlocked,
    itemIndex,
  );
  const rested: InternalPlacement[] = [];
  const crowded: InternalPlacement[] = [];
  const seen = new Set<string>();

  for (const window of problem.windows) {
    if (!allowed.has(window.locationId)) {
      continue;
    }

    const occupied = node.locationBlocked.get(window.locationId) ?? [];
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
      for (const start of possibleStarts(
        free,
        item.durationMs,
        preferredStarts(problem, node.assigned, itemIndex, free),
      )) {
        const key = `${window.locationId}:${start}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
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

  return limitPlacements(rested.length > 0 ? rested : crowded);
}

type PlanShape = Array<{ key: string; locationId: string; start: number }>;

/**
 * Identity is what the calendar shows, not which draft row produced it: the same
 * choreography added twice is interchangeable, so plans are compared as sorted sets.
 */
function planShape(assigned: InternalPlacement[], problem: SchedulingProblem): PlanShape {
  return assigned
    .map((placement) => {
      const item = problem.items[placement.itemIndex];
      return {
        key: `${item.choreographyId}:${item.groupId ?? ""}:${item.durationMs}`,
        locationId: placement.locationId,
        start: placement.start,
      };
    })
    .sort((a, b) => (a.key === b.key ? a.start - b.start : a.key.localeCompare(b.key)));
}

/** Nudging the whole day by a few minutes is not a second option to choose from. */
function samePlan(a: PlanShape, b: PlanShape): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((placement, index) => {
    const other = b[index];
    return (
      placement.key === other.key &&
      placement.locationId === other.locationId &&
      Math.abs(placement.start - other.start) < DISTINCT_START_TOLERANCE_MS
    );
  });
}

function extendNode(
  node: SearchNode,
  placement: InternalPlacement,
  problem: SchedulingProblem,
): SearchNode {
  return {
    assigned: [...node.assigned, placement],
    score:
      node.score +
      scorePlacementDelta(node.assigned, placement, problem),
    // Most children are discarded by the beam. Build these indexes only for
    // survivors in hydrateNode instead of copying maps for every successor.
    locationBlocked: new Map(),
    participantBlocked: new Map(),
  };
}

function hydrateNode(node: SearchNode, problem: SchedulingProblem): SearchNode {
  const locationBlocked = new Map<string, IntervalMs[]>();
  const participantBlocked = new Map<string, IntervalMs[]>();

  for (const placement of node.assigned) {
    const blocked = withRest(placement, problem.restMs);
    locationBlocked.set(placement.locationId, [
      ...(locationBlocked.get(placement.locationId) ?? []),
      blocked,
    ]);
    const participantIds = new Set(
      problem.items[placement.itemIndex].participants.map(
        (participant) => participant.id,
      ),
    );
    for (const participantId of participantIds) {
      participantBlocked.set(participantId, [
        ...(participantBlocked.get(participantId) ?? []),
        blocked,
      ]);
    }
  }

  for (const [key, intervals] of locationBlocked) {
    locationBlocked.set(key, mergeIntervals(intervals));
  }
  for (const [key, intervals] of participantBlocked) {
    participantBlocked.set(key, mergeIntervals(intervals));
  }
  return { ...node, locationBlocked, participantBlocked };
}

function exactStateKey(node: SearchNode): string {
  return node.assigned
    .map(
      (placement) =>
        `${placement.itemIndex}:${placement.locationId}:${placement.start}`,
    )
    .sort()
    .join("|");
}

function coarseStateKey(node: SearchNode, problem: SchedulingProblem): string {
  return planShape(node.assigned, problem)
    .map(
      (placement) =>
        `${placement.key}:${placement.locationId}:${Math.floor(
          placement.start / DISTINCT_START_TOLERANCE_MS,
        )}`,
    )
    .join("|");
}

/**
 * Prefer genuinely different partial plans. If there are not enough diverse
 * states to fill the beam, retain the best remaining exact states as fallback.
 */
function pruneLayer(nodes: SearchNode[], problem: SchedulingProblem): SearchNode[] {
  nodes.sort((a, b) => b.score - a.score);
  const exactSeen = new Set<string>();
  const deferred: SearchNode[] = [];
  const selected: SearchNode[] = [];
  const similarCounts = new Map<string, number>();

  for (const node of nodes) {
    const exact = exactStateKey(node);
    if (exactSeen.has(exact)) {
      continue;
    }
    exactSeen.add(exact);

    const coarse = coarseStateKey(node, problem);
    const count = similarCounts.get(coarse) ?? 0;
    if (count >= MAX_SIMILAR_PER_LAYER) {
      deferred.push(node);
      continue;
    }
    similarCounts.set(coarse, count + 1);
    selected.push(node);
    if (selected.length >= MAX_OPEN) {
      return selected;
    }
  }

  for (const node of deferred) {
    selected.push(node);
    if (selected.length >= MAX_OPEN) {
      break;
    }
  }
  return selected;
}

function toCandidate(
  id: string,
  assigned: InternalPlacement[],
  problem: SchedulingProblem,
  t: ServerTranslator,
): SchedulingCandidate {
  const { score, caveats } = scoreSchedule(assigned, problem, t);
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
          locationName: locationNames.get(placement.locationId) ?? t("resources.Location"),
          startsAt: new Date(placement.start).toISOString(),
          endsAt: new Date(placement.end).toISOString(),
          choreographerNames: item.choreographers
            .map((person) => person.name)
            .sort((a, b) => a.localeCompare(b)),
          choreographerIds: item.choreographers.map((person) => person.id),
          participantNames: item.participants
            .map((person) => person.name)
            .sort((a, b) => a.localeCompare(b)),
          participantIds: item.participants.map((person) => person.id),
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
export function generateScheduleCandidates(
  problem: SchedulingProblem,
  t: ServerTranslator = englishSchedulingTranslator,
): SchedulingCandidate[] {
  if (problem.items.length === 0) {
    return [];
  }

  const order = itemOrder(problem);
  let layer: SearchNode[] = [
    {
      assigned: [],
      score: 0,
      locationBlocked: new Map(),
      participantBlocked: new Map(),
    },
  ];
  let expansions = 0;

  for (let depth = 0; depth < order.length; depth += 1) {
    const itemIndex = order[depth];
    const nextLayer: SearchNode[] = [];

    for (const node of layer) {
      if (expansions >= MAX_EXPANSIONS) {
        break;
      }
      expansions += 1;
      const options = successorPlacements(problem, node, itemIndex);
      for (const placement of options) {
        nextLayer.push(extendNode(node, placement, problem));
      }
    }

    if (nextLayer.length === 0) {
      return [];
    }

    layer = pruneLayer(nextLayer, problem).map((node) =>
      hydrateNode(node, problem),
    );
  }

  const shapes: PlanShape[] = [];
  const unique: SearchNode[] = [];
  for (const node of layer.sort((a, b) => b.score - a.score)) {
    const shape = planShape(node.assigned, problem);
    if (shapes.some((accepted) => samePlan(shape, accepted))) {
      continue;
    }
    shapes.push(shape);
    unique.push(node);
    if (unique.length >= CANDIDATE_COUNT) {
      break;
    }
  }

  return unique.map((node, index) =>
    toCandidate(String(index + 1), node.assigned, problem, t),
  );
}
