import { describe, expect, it } from 'vitest';
import { sourceView } from './source';

describe('sourceView (A6)', () => {
  it('links a seed https source with rel="noopener noreferrer nofollow" and no target', () => {
    const view = sourceView({ source: 'https://example.com/eval/report?run=7#summary', origin: 'seed' });
    expect(view).toEqual({
      kind: 'link',
      text: 'https://example.com/eval/report?run=7#summary',
      href: 'https://example.com/eval/report?run=7#summary',
      rel: 'noopener noreferrer nofollow',
    });
    expect(view).not.toHaveProperty('target');
  });

  it('never links a visitor source, even a valid https one', () => {
    expect(sourceView({ source: 'https://example.com/looks-official', origin: 'visitor' })).toEqual({
      kind: 'text',
      text: 'https://example.com/looks-official',
    });
  });

  it('shows a seed source that is not https as plain text', () => {
    for (const source of ['http://example.com', 'javascript:alert(1)', 'data:text/html,hi', 'mailto:a@example.com']) {
      expect(sourceView({ source, origin: 'seed' })).toEqual({ kind: 'text', text: source });
    }
  });

  it('shows a seed source that does not parse as a URL as plain text', () => {
    for (const source of ['not a url', 'example.com/report', '//example.com/report']) {
      expect(sourceView({ source, origin: 'seed' })).toEqual({ kind: 'text', text: source });
    }
  });

  it('applies new URL(source).protocol exactly, so an upper-case scheme still links', () => {
    expect(sourceView({ source: 'HTTPS://Example.com/Report', origin: 'seed' })).toEqual({
      kind: 'link',
      text: 'HTTPS://Example.com/Report',
      href: 'https://example.com/Report',
      rel: 'noopener noreferrer nofollow',
    });
  });

  it('reports no source for a null source, whatever the origin', () => {
    expect(sourceView({ source: null, origin: 'seed' })).toEqual({ kind: 'none' });
    expect(sourceView({ source: null, origin: 'visitor' })).toEqual({ kind: 'none' });
  });
});
