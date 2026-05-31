import getLoomEmbedUrl from './getLoomEmbedUrl';

describe('getLoomEmbedUrl', () => {
  it('rewrites a Loom share link to the embed form', () => {
    expect(
      getLoomEmbedUrl('https://www.loom.com/share/abc123def456')
    ).toBe('https://www.loom.com/embed/abc123def456');
  });

  it('preserves a trailing query string', () => {
    expect(
      getLoomEmbedUrl('https://www.loom.com/share/abc123?sid=xyz')
    ).toBe('https://www.loom.com/embed/abc123?sid=xyz');
  });

  it('leaves an already-embed URL unchanged', () => {
    expect(
      getLoomEmbedUrl('https://www.loom.com/embed/abc123')
    ).toBe('https://www.loom.com/embed/abc123');
  });
});
