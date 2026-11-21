import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { registerMap } from '../../map';
import { useIsMapRegistered } from './maps';

describe('registerMap', () => {
  it('tells the components waiting for a map once it is registered, and only for that map', () => {
    const waiting = renderHook(() => useIsMapRegistered('islands'));
    const other = renderHook(() => useIsMapRegistered('mountains'));
    expect(waiting.result.current).toBe(false);

    act(() => registerMap('islands', { type: 'FeatureCollection', features: [] }));
    expect(waiting.result.current).toBe(true);
    expect(other.result.current).toBe(false);
  });
});
