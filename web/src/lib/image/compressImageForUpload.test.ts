import { describe, it, expect } from 'vitest';
import {
  compressImageForUpload,
  compressedName,
  scaledDimensions,
  shouldCompressType,
} from './compressImageForUpload';

describe('shouldCompressType', () => {
  it('compresses still images', () => {
    expect(shouldCompressType('image/png')).toBe(true);
    expect(shouldCompressType('image/jpeg')).toBe(true);
    expect(shouldCompressType('image/webp')).toBe(true);
  });

  it('leaves gifs alone so animation survives', () => {
    expect(shouldCompressType('image/gif')).toBe(false);
  });

  it('leaves non-images alone', () => {
    expect(shouldCompressType('application/pdf')).toBe(false);
    expect(shouldCompressType('')).toBe(false);
  });
});

describe('compressedName', () => {
  it('swaps the extension for .jpg', () => {
    expect(compressedName('tempImage6NByyR.png')).toBe('tempImage6NByyR.jpg');
    expect(compressedName('IMG_0495.HEIC')).toBe('IMG_0495.jpg');
  });

  it('falls back to image.jpg for an empty base name', () => {
    expect(compressedName('.png')).toBe('image.jpg');
  });
});

describe('scaledDimensions', () => {
  it('keeps images within the cap unchanged', () => {
    expect(scaledDimensions(1000, 800)).toEqual({ width: 1000, height: 800 });
  });

  it('scales the long edge down to the cap', () => {
    // 4032x3024 (12 MP iPhone photo) → long edge 1568.
    expect(scaledDimensions(4032, 3024)).toEqual({ width: 1568, height: 1176 });
  });
});

describe('compressImageForUpload', () => {
  it('returns a PDF untouched without touching the canvas', async () => {
    const pdf = new File([new Uint8Array([1, 2, 3])], 'notes.pdf', {
      type: 'application/pdf',
    });
    await expect(compressImageForUpload(pdf)).resolves.toBe(pdf);
  });

  it('returns a gif untouched', async () => {
    const gif = new File([new Uint8Array([1])], 'anim.gif', {
      type: 'image/gif',
    });
    await expect(compressImageForUpload(gif)).resolves.toBe(gif);
  });
});
