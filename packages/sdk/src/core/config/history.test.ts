import { describe, expect, it } from 'vitest';
import {
  canRedo,
  canUndo,
  HISTORY_LIMIT,
  record,
  redo,
  startHistory,
  undo,
  type History,
} from './history';

const edits = (history: History<string>, ...steps: string[]) =>
  steps.reduce((current, step) => record(current, step), history);

describe('history', () => {
  it('FR-5.10 undoes and redoes edits in order, back to the very first version', () => {
    const first = { title: 'saved' };
    let history = record(record(startHistory(first), { title: 'a' }), { title: 'b' });
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);

    history = undo(undo(history));
    expect(history.present).toBe(first);
    expect(canUndo(history)).toBe(false);
    expect(undo(history)).toBe(history);

    history = redo(history);
    expect(history.present).toEqual({ title: 'a' });
    history = redo(history);
    expect(history.present).toEqual({ title: 'b' });
    expect(redo(history)).toBe(history);
  });

  it('FR-5.10 forgets what could be redone once a new edit is made', () => {
    const history = record(undo(edits(startHistory('saved'), 'a', 'b')), 'c');
    expect(history.present).toBe('c');
    expect(canRedo(history)).toBe(false);
    expect(undo(history).present).toBe('a');
  });

  it('FR-5.10 does not count an edit that changes nothing', () => {
    const history = startHistory('saved');
    expect(record(history, 'saved')).toBe(history);
  });

  it('FR-5.10 merges a run of edits to one setting into one step, and only a run', () => {
    let history = startHistory('');
    for (const typed of ['N', 'Ne', 'New']) history = record(history, typed, 'title:countries');
    expect(history.past).toEqual(['']);
    expect(undo(history).present).toBe('');

    // Another setting in between, or an undo, ends the run.
    history = record(record(history, 'New, moved'), 'New, moved!', 'title:countries');
    expect(history.past).toEqual(['', 'New', 'New, moved']);
    history = record(undo(history), 'New, moved?', 'title:countries');
    expect(history.past).toEqual(['', 'New', 'New, moved']);
  });

  it(`FR-5.10 keeps the last ${HISTORY_LIMIT} steps`, () => {
    let history = startHistory(0);
    for (let step = 1; step <= HISTORY_LIMIT + 5; step++) history = record(history, step);
    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.past[0]).toBe(5);
  });
});
