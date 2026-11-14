"use client";

import { useState } from "react";

/**
 * Ids that appeared since the previous render of a list (none on first render), so a freshly
 * added row can be highlighted once instead of every row animating on page load.
 */
export function useNewlyAdded(ids: string[]): ReadonlySet<string> {
  const key = ids.join("|");
  const [state, setState] = useState(() => ({
    key,
    known: new Set(ids),
    fresh: new Set<string>() as ReadonlySet<string>,
  }));
  if (state.key !== key) {
    const fresh = new Set(ids.filter((id) => !state.known.has(id)));
    setState({ key, known: new Set([...state.known, ...ids]), fresh });
  }
  return state.fresh;
}
