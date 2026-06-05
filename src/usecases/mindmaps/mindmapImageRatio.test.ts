import { mindmapImageRatio } from './mindmapImageRatio';
import { MindmapData } from './MindmapData';

const emptyMap = (): MindmapData => ({ nodes: [], edges: [] });

const mapWithImages = (count: number): MindmapData => ({
  nodes: Array.from({ length: count }, (_, i) => ({
    id: String(i),
    label: `Node ${i}`,
    image: { url: `https://example.com/${i}.png`, width: 100, height: 100 },
  })),
  edges: [],
});

const mapWithoutImages = (nodeCount: number): MindmapData => ({
  nodes: Array.from({ length: nodeCount }, (_, i) => ({
    id: String(i),
    label: `Node ${i}`,
  })),
  edges: [],
});

describe('mindmapImageRatio', () => {
  it('returns zero counts and null ratio for an empty collection', () => {
    const result = mindmapImageRatio([]);
    expect(result).toEqual({ total: 0, withImages: 0, ratio: null });
  });

  it('returns 0 ratio when no maps have images', () => {
    const result = mindmapImageRatio([emptyMap(), mapWithoutImages(3)]);
    expect(result).toEqual({ total: 2, withImages: 0, ratio: 0 });
  });

  it('counts a map as having images when at least one node has an image', () => {
    const result = mindmapImageRatio([mapWithImages(1), mapWithoutImages(2)]);
    expect(result).toEqual({ total: 2, withImages: 1, ratio: 0.5 });
  });

  it('counts all maps when every map has at least one image', () => {
    const result = mindmapImageRatio([mapWithImages(2), mapWithImages(5)]);
    expect(result).toEqual({ total: 2, withImages: 2, ratio: 1 });
  });

  it('treats a node with image.url === null as not having an image', () => {
    const mapWithNullUrl: MindmapData = {
      nodes: [
        { id: '1', label: 'A', image: { url: null, width: 0, height: 0 } },
      ],
      edges: [],
    };
    const result = mindmapImageRatio([mapWithNullUrl]);
    expect(result).toEqual({ total: 1, withImages: 0, ratio: 0 });
  });

  it('rounds ratio to four decimal places', () => {
    const maps = Array.from({ length: 3 }, (_, i) =>
      i === 0 ? mapWithImages(1) : mapWithoutImages(1)
    );
    const result = mindmapImageRatio(maps);
    expect(result.ratio).toBe(0.3333);
  });
});
