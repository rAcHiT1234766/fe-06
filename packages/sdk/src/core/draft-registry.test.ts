import { describe, expect, it, vi } from 'vitest';
import { createDraftRegistry } from './draft-registry';

describe('createDraftRegistry', () => {
  it('reports unsaved changes until every builder that held them lets go', () => {
    const drafts = createDraftRegistry();
    const listener = vi.fn();
    const unsubscribe = drafts.subscribe(listener);
    expect(drafts.hasUnsaved()).toBe(false);

    const releaseFirst = drafts.hold();
    const releaseSecond = drafts.hold();
    releaseFirst();
    // A second release of the same hold must not let go of the other builder's.
    releaseFirst();
    expect(drafts.hasUnsaved()).toBe(true);
    releaseSecond();
    expect(drafts.hasUnsaved()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(4);

    unsubscribe();
    drafts.hold();
    expect(listener).toHaveBeenCalledTimes(4);
  });
});
