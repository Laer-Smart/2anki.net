import { countVisionTokens, VISION_TOKEN_CEILING } from './countVisionTokens';

describe('countVisionTokens', () => {
  it.each([
    { width: 100, height: 100, expectedTiles: 1 },
    { width: 512, height: 512, expectedTiles: 1 },
    { width: 513, height: 512, expectedTiles: 2 },
    { width: 1024, height: 1024, expectedTiles: 4 },
    { width: 512, height: 1024, expectedTiles: 2 },
    { width: 200, height: 800, expectedTiles: 2 },
    { width: 1, height: 1, expectedTiles: 1 },
  ])(
    '$width×$height → $expectedTiles tiles',
    ({ width, height, expectedTiles }) => {
      const result = countVisionTokens({ width, height });
      expect(result.tiles).toBe(expectedTiles);
      expect(result.tokens).toBe(2833 + expectedTiles * 1601);
    }
  );

  it('scales 4000×3000 to fit within 1568×1568 before tiling', () => {
    const result = countVisionTokens({ width: 4000, height: 3000 });
    expect(result.tiles).toBeLessThanOrEqual(16);
    expect(result.tiles).toBeGreaterThan(0);
  });

  it('returns tile count alongside token count', () => {
    const result = countVisionTokens({ width: 1024, height: 1024 });
    expect(result.tiles).toBe(4);
  });

  it.each(['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const)(
    'accepts %s media type',
    (mediaType) => {
      const result = countVisionTokens({ width: 512, height: 512, mediaType });
      expect(result.tokens).toBeGreaterThan(0);
    }
  );

  it('a 4K image tiles to at most 16 tiles after scaling', () => {
    const result = countVisionTokens({ width: 3840, height: 2160 });
    expect(result.tiles).toBeLessThanOrEqual(16);
    expect(result.tiles).toBeGreaterThanOrEqual(1);
  });

  it('VISION_TOKEN_CEILING is exported and positive', () => {
    expect(VISION_TOKEN_CEILING).toBeGreaterThan(0);
  });

  it('1×1 image produces base token count plus 1 tile', () => {
    const result = countVisionTokens({ width: 1, height: 1 });
    expect(result.tokens).toBe(2833 + 1601);
    expect(result.tiles).toBe(1);
  });
});
