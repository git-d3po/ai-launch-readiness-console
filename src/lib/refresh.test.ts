import { describe, expect, it } from 'vitest';
import { showsLoading } from './refresh';

describe('showsLoading', () => {
  it('shows the loading state for an initial load and for a route change', () => {
    expect(showsLoading(undefined, 1)).toBe(true);
    expect(showsLoading(1, 2)).toBe(true);
  });

  it('keeps the content on screen for a refresh of the same key', () => {
    expect(showsLoading(1, 1)).toBe(false);
  });
});
