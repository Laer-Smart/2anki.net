import { detectImageMediaType } from './convertImageToHTML';

const toBase64 = (bytes: number[]): string =>
  Buffer.from(bytes).toString('base64');

describe('detectImageMediaType', () => {
  it('returns image/jpeg for JPEG bytes even when the source was labeled png', () => {
    const jpeg = toBase64([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectImageMediaType(jpeg)).toBe('image/jpeg');
  });

  it('returns image/png for PNG bytes', () => {
    const png = toBase64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectImageMediaType(png)).toBe('image/png');
  });

  it('returns image/gif for GIF bytes', () => {
    const gif = toBase64([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(detectImageMediaType(gif)).toBe('image/gif');
  });

  it('returns image/webp for WEBP bytes', () => {
    const webp = toBase64([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(detectImageMediaType(webp)).toBe('image/webp');
  });

  it('falls back to image/png when the bytes are not a recognized image', () => {
    const unknown = toBase64([0x00, 0x01, 0x02, 0x03]);
    expect(detectImageMediaType(unknown)).toBe('image/png');
  });
});
