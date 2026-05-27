import { describe, expect, it, vi } from 'vitest';
import { extractApkgMediaUrls, inlineApkgMedia } from './inlineMedia';

const HTML =
  '<img src="/api/apkg/k1/media/a.png" /><hr/>' +
  '<img src="/api/apkg/k1/media/a.png" />' +
  '<img src="/api/apkg/k1/media/b.png" />' +
  '<img src="https://cdn.example.com/x.png" />';

describe('extractApkgMediaUrls', () => {
  it('returns unique media URLs and ignores external/non-media URLs', () => {
    expect(extractApkgMediaUrls(HTML)).toEqual([
      '/api/apkg/k1/media/a.png',
      '/api/apkg/k1/media/b.png',
    ]);
  });

  it('matches URL-encoded filenames (spaces, dots)', () => {
    const html =
      '<img src="/api/apkg/1-x.apkg/media/Presentasjon%20uten%20tittel.pdf-page1-1.png" />';
    expect(extractApkgMediaUrls(html)).toEqual([
      '/api/apkg/1-x.apkg/media/Presentasjon%20uten%20tittel.pdf-page1-1.png',
    ]);
  });
});

describe('inlineApkgMedia', () => {
  it('replaces media URLs with data URLs and fetches each unique URL once', async () => {
    const loader = vi.fn(async (url: string) =>
      url.endsWith('a.png')
        ? 'data:image/png;base64,AAA'
        : 'data:image/png;base64,BBB'
    );
    const out = await inlineApkgMedia(HTML, loader);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(out).toContain('src="data:image/png;base64,AAA"');
    expect(out).toContain('src="data:image/png;base64,BBB"');
    expect(out).not.toContain('/api/apkg/k1/media/');
    expect(out).toContain('https://cdn.example.com/x.png');
  });

  it('leaves the URL in place when the loader fails (returns null)', async () => {
    const loader = vi.fn(async () => null);
    const out = await inlineApkgMedia(
      '<img src="/api/apkg/k1/media/a.png" />',
      loader
    );
    expect(out).toContain('/api/apkg/k1/media/a.png');
  });

  it('reuses a shared cache across calls so media is fetched once', async () => {
    const loader = vi.fn(async () => 'data:image/png;base64,AAA');
    const cache = new Map<string, string | null>();
    const html = '<img src="/api/apkg/k1/media/a.png" />';
    await inlineApkgMedia(html, loader, cache);
    await inlineApkgMedia(html, loader, cache);
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
