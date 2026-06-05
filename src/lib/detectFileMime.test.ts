import { detectFileMime } from './detectFileMime';

function bufWith(sig: number[], extra: number = 16): Buffer {
  return Buffer.concat([Buffer.from(sig), Buffer.alloc(extra)]);
}

describe('detectFileMime', () => {
  it('detects PDF', () => {
    expect(detectFileMime(bufWith([0x25, 0x50, 0x44, 0x46]))).toBe(
      'application/pdf'
    );
  });

  it('detects PNG', () => {
    expect(
      detectFileMime(bufWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ).toBe('image/png');
  });

  it('detects JPEG', () => {
    expect(detectFileMime(bufWith([0xff, 0xd8, 0xff]))).toBe('image/jpeg');
  });

  it('detects GIF87a', () => {
    expect(detectFileMime(bufWith([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]))).toBe(
      'image/gif'
    );
  });

  it('detects GIF89a', () => {
    expect(detectFileMime(bufWith([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe(
      'image/gif'
    );
  });

  it('detects WebP (RIFF + WEBP at offset 8)', () => {
    const buf = Buffer.concat([
      Buffer.from([0x52, 0x49, 0x46, 0x46]),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
      Buffer.from([0x57, 0x45, 0x42, 0x50]),
      Buffer.alloc(8),
    ]);
    expect(detectFileMime(buf)).toBe('image/webp');
  });

  it('returns null for RIFF without WEBP marker', () => {
    const buf = Buffer.concat([
      Buffer.from([0x52, 0x49, 0x46, 0x46]),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
      Buffer.from([0x57, 0x41, 0x56, 0x45]),
      Buffer.alloc(8),
    ]);
    expect(detectFileMime(buf)).toBeNull();
  });

  it('returns null for unrecognized bytes', () => {
    expect(
      detectFileMime(Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]))
    ).toBeNull();
  });

  it('returns null for an empty buffer', () => {
    expect(detectFileMime(Buffer.alloc(0))).toBeNull();
  });

  it('returns null for a buffer too short for the shortest signature', () => {
    expect(detectFileMime(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});
