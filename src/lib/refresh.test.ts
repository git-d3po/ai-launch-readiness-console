import { describe, expect, it } from 'vitest';
import { keepsContentOnFailure, showsLoading } from './refresh';

describe('showsLoading', () => {
  it('shows the loading state for an initial load and for a route change', () => {
    expect(showsLoading(undefined, 1)).toBe(true);
    expect(showsLoading(1, 2)).toBe(true);
  });

  it('keeps the content on screen for a refresh of the same key', () => {
    expect(showsLoading(1, 1)).toBe(false);
  });
});

describe('keepsContentOnFailure', () => {
  it('keeps the content on screen when a refresh of it fails', () => {
    expect(keepsContentOnFailure(true, true)).toBe(true);
  });

  it('shows the error when an initial load or route change fails, or nothing was shown yet', () => {
    expect(keepsContentOnFailure(false, true)).toBe(false);
    expect(keepsContentOnFailure(false, false)).toBe(false);
    expect(keepsContentOnFailure(true, false)).toBe(false);
  });
});
