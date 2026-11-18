/**
 * The versions of a draft: the current one, the ones before it (oldest first) and, after an undo,
 * the ones that can be redone (nearest first). Every version is kept whole, so undoing to the start
 * gives back the very object the draft began from.
 */
export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  /** What the last edit changed, so that a run of edits to one setting can merge into one step. */
  group?: string | undefined;
}

/** How many steps can be undone. Older ones are forgotten. */
export const HISTORY_LIMIT = 100;

export const startHistory = <T>(present: T): History<T> => ({ past: [], present, future: [] });

/**
 * Records an edit and forgets anything that could have been redone. An edit that changes nothing is
 * not a step. One with the same `group` as the edit before it replaces that step instead of adding
 * one, so typing a title is undone in one go rather than a letter at a time.
 */
export function record<T>(history: History<T>, next: T, group?: string): History<T> {
  if (next === history.present) return history;
  if (group !== undefined && group === history.group) {
    return { ...history, present: next, future: [] };
  }
  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
    group,
  };
}

export const canUndo = (history: History<unknown>) => history.past.length > 0;
export const canRedo = (history: History<unknown>) => history.future.length > 0;

export function undo<T>(history: History<T>): History<T> {
  const previous = history.past.at(-1);
  if (previous === undefined) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redo<T>(history: History<T>): History<T> {
  const [next, ...rest] = history.future;
  if (next === undefined) return history;
  return { past: [...history.past, history.present], present: next, future: rest };
}
