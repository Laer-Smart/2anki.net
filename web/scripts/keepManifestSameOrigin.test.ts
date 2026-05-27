import { describe, it, expect } from 'vitest';
import { keepManifestSameOrigin } from './keepManifestSameOrigin';

const CDN = 'https://2anki-assets.fra1.cdn.digitaloceanspaces.com/';

describe('keepManifestSameOrigin', () => {
  it('rewrites a CDN-prefixed manifest href back to root-relative', () => {
    const input = `<link rel="manifest" href="${CDN}site.webmanifest" />`;
    expect(keepManifestSameOrigin(input)).toBe(
      '<link rel="manifest" href="/site.webmanifest" />'
    );
  });

  it('is a no-op when the manifest href is already root-relative', () => {
    const input = '<link rel="manifest" href="/site.webmanifest" />';
    expect(keepManifestSameOrigin(input)).toBe(input);
  });

  it('does not touch favicon link hrefs', () => {
    const input = [
      `<link rel="icon" href="${CDN}favicon.ico" sizes="any" />`,
      `<link rel="manifest" href="${CDN}site.webmanifest" />`,
      `<link rel="apple-touch-icon" href="${CDN}apple-touch-icon.png" />`,
    ].join('\n');
    const result = keepManifestSameOrigin(input);
    expect(result).toContain(`href="${CDN}favicon.ico"`);
    expect(result).toContain('href="/site.webmanifest"');
    expect(result).toContain(`href="${CDN}apple-touch-icon.png"`);
  });

  it('handles a trailing-slash CDN base', () => {
    const input = `<link rel="manifest" href="${CDN}site.webmanifest" />`;
    expect(keepManifestSameOrigin(input)).toBe(
      '<link rel="manifest" href="/site.webmanifest" />'
    );
  });

  it('is idempotent when called twice', () => {
    const input = `<link rel="manifest" href="${CDN}site.webmanifest" />`;
    const once = keepManifestSameOrigin(input);
    expect(keepManifestSameOrigin(once)).toBe(once);
  });
});
