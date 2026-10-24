import { useCallback, useReducer } from "react";
import type { SchedulePlacement } from "@/lib/scheduling/types";

const MAX_HISTORY = 50;

type PlacementHistoryState = {
  past: SchedulePlacement[][];
  present: SchedulePlacement[];
  future: SchedulePlacement[][];
};

type PlacementHistoryAction =
  | { type: "reset"; placements: SchedulePlacement[] }
  | { type: "commit"; placements: SchedulePlacement[] }
  | { type: "undo" }
  | { type: "redo" };

function clonePlacements(placements: SchedulePlacement[]): SchedulePlacement[] {
  return placements.map((placement) => ({ ...placement }));
}

export function placementsScheduleEqual(
  left: SchedulePlacement[],
  right: SchedulePlacement[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const key = (placement: SchedulePlacement) =>
    `${placement.itemId}:${placement.locationId}:${placement.startsAt}:${placement.endsAt}`;
  const leftKeys = left.map(key).sort().join("\0");
  const rightKeys = right.map(key).sort().join("\0");
  return leftKeys === rightKeys;
}

function trimPast(past: SchedulePlacement[][]): SchedulePlacement[][] {
  if (past.length <= MAX_HISTORY) {
    return past;
  }
  return past.slice(past.length - MAX_HISTORY);
}

export function placementHistoryReducer(
  state: PlacementHistoryState,
  action: PlacementHistoryAction,
): PlacementHistoryState {
  switch (action.type) {
    case "reset":
      return {
        past: [],
        present: clonePlacements(action.placements),
        future: [],
      };
    case "commit": {
      const next = clonePlacements(action.placements);
      if (placementsScheduleEqual(state.present, next)) {
        return state;
      }
      return {
        past: trimPast([...state.past, clonePlacements(state.present)]),
        present: next,
        future: [],
      };
    }
    case "undo": {
      if (state.past.length === 0) {
        return state;
      }
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: clonePlacements(previous),
        future: [clonePlacements(state.present), ...state.future],
      };
    }
    case "redo": {
      if (state.future.length === 0) {
        return state;
      }
      const [next, ...future] = state.future;
      return {
        past: trimPast([...state.past, clonePlacements(state.present)]),
        present: clonePlacements(next),
        future,
      };
    }
    default:
      return state;
  }
}

export function useSchedulePlacementHistory(initial: SchedulePlacement[] = []) {
  const [state, dispatch] = useReducer(placementHistoryReducer, {
    past: [],
    present: clonePlacements(initial),
    future: [],
  });

  const reset = useCallback((placements: SchedulePlacement[]) => {
    dispatch({ type: "reset", placements });
  }, []);

  const commit = useCallback((placements: SchedulePlacement[]) => {
    dispatch({ type: "commit", placements });
  }, []);

  const undo = useCallback((): SchedulePlacement[] | null => {
    if (state.past.length === 0) {
      return null;
    }
    const previous = state.past[state.past.length - 1];
    dispatch({ type: "undo" });
    return clonePlacements(previous);
  }, [state.past]);

  const redo = useCallback((): SchedulePlacement[] | null => {
    if (state.future.length === 0) {
      return null;
    }
    const next = state.future[0];
    dispatch({ type: "redo" });
    return clonePlacements(next);
  }, [state.future]);

  return {
    placements: state.present,
    reset,
    commit,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
