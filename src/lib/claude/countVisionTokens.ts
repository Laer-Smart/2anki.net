export type VisionMediaType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp';

export interface VisionTokenResult {
  tokens: number;
  tiles: number;
}

export interface VisionImageDimensions {
  width: number;
  height: number;
  mediaType?: VisionMediaType;
}

const MAX_DIMENSION = 1568;
const TILE_SIZE = 512;
const BASE_TOKENS = 2833;
const TOKENS_PER_TILE = 1601;

// Token formula from https://docs.anthropic.com/en/docs/build-with-claude/vision#image-costs
// Image is first scaled to fit within MAX_DIMENSION×MAX_DIMENSION, then tiled in TILE_SIZE×TILE_SIZE cells.
// Total = BASE_TOKENS + (ceil(w/TILE_SIZE) * ceil(h/TILE_SIZE)) * TOKENS_PER_TILE
export function countVisionTokens(
  dimensions: VisionImageDimensions
): VisionTokenResult {
  let { width, height } = dimensions;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.floor(width * scale);
    height = Math.floor(height * scale);
  }

  const tilesX = Math.ceil(width / TILE_SIZE);
  const tilesY = Math.ceil(height / TILE_SIZE);
  const tiles = tilesX * tilesY;
  const tokens = BASE_TOKENS + tiles * TOKENS_PER_TILE;

  return { tokens, tiles };
}

// Default ceiling: 15 tiles ≈ $0.075 per photo (from spec cost-cap section).
// Override with VISION_TOKEN_CEILING_OVERRIDE env var for A/B testing without a deploy.
export const VISION_TOKEN_CEILING: number = process.env
  .VISION_TOKEN_CEILING_OVERRIDE
  ? Number(process.env.VISION_TOKEN_CEILING_OVERRIDE)
  : BASE_TOKENS + 15 * TOKENS_PER_TILE;
