import { describe, it, expect } from 'vitest';
import { keepRootAssetsSameOrigin } from './keepRootAssetsSameOrigin';

const CDN = 'https://2anki-assets.fra1.cdn.digitaloceanspaces.com/';

describe('keepRootAssetsSameOrigin', () => {
  it('rewrites a CDN-prefixed manifest href back to root-relative', () => {
    const input = `<link rel="manifest" href="${CDN}site.webmanifest" />`;
    expect(keepRootAssetsSameOrigin(input)).toBe(
      '<link rel="manifest" href="/site.webmanifest" />'
    );
  });

  it('rewrites a CDN-prefixed favicon.ico href back to root-relative', () => {
    const input = `<link rel="icon" href="${CDN}favicon.ico" sizes="any" />`;
    expect(keepRootAssetsSameOrigin(input)).toBe(
      '<link rel="icon" href="/favicon.ico" sizes="any" />'
    );
  });

  it('rewrites hashed-name PNG favicons back to a root-relative path', () => {
    const input = `<link rel="icon" type="image/png" sizes="32x32" href="${CDN}favicon-32x32.png" />`;
    expect(keepRootAssetsSameOrigin(input)).toBe(
      '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />'
    );
  });

  it('rewrites the apple-touch-icon href back to root-relative', () => {
    const input = `<link rel="apple-touch-icon" href="${CDN}apple-touch-icon.png" />`;
    expect(keepRootAssetsSameOrigin(input)).toBe(
      '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />'
    );
  });

  it('rewrites every icon and manifest link in a head block', () => {
    const input = [
      `<link rel="icon" href="${CDN}favicon.ico" sizes="any" />`,
      `<link rel="icon" type="image/png" sizes="32x32" href="${CDN}favicon-32x32.png" />`,
      `<link rel="icon" type="image/png" sizes="16x16" href="${CDN}favicon-16x16.png" />`,
      `<link rel="manifest" href="${CDN}site.webmanifest" />`,
      `<link rel="apple-touch-icon" href="${CDN}apple-touch-icon.png" />`,
    ].join('\n');
    const result = keepRootAssetsSameOrigin(input);
    expect(result).toContain('href="/favicon.ico"');
    expect(result).toContain('href="/favicon-32x32.png"');
    expect(result).toContain('href="/favicon-16x16.png"');
    expect(result).toContain('href="/site.webmanifest"');
    expect(result).toContain('href="/apple-touch-icon.png"');
    expect(result).not.toContain(CDN);
  });

  it('leaves non-icon links such as canonical and preconnect untouched', () => {
    const input = [
      '<link rel="canonical" href="https://2anki.net" />',
      '<link rel="preconnect" href="https://fonts.googleapis.com">',
    ].join('\n');
    expect(keepRootAssetsSameOrigin(input)).toBe(input);
  });

  it('is a no-op when icon hrefs are already root-relative', () => {
    const input = [
      '<link rel="icon" href="/favicon.ico" sizes="any" />',
      '<link rel="manifest" href="/site.webmanifest" />',
    ].join('\n');
    expect(keepRootAssetsSameOrigin(input)).toBe(input);
  });

  it('is idempotent when called twice', () => {
    const input = `<link rel="icon" href="${CDN}favicon.ico" sizes="any" />`;
    const once = keepRootAssetsSameOrigin(input);
    expect(keepRootAssetsSameOrigin(once)).toBe(once);
  });
});
