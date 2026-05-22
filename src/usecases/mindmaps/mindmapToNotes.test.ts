import { mindmapToNotes } from './mindmapToNotes';

describe('mindmapToNotes', () => {
  it('returns empty array for empty graph', () => {
    const result = mindmapToNotes({ nodes: [], edges: [] });
    expect(result).toEqual([]);
  });

  it('returns empty array for disconnected nodes (no edges)', () => {
    const result = mindmapToNotes({
      nodes: [
        { id: '1', label: 'Root' },
        { id: '2', label: 'Isolated' },
      ],
      edges: [],
    });
    expect(result).toEqual([]);
  });

  it('creates one card per edge (star graph)', () => {
    const result = mindmapToNotes({
      nodes: [
        { id: 'root', label: 'Anatomy' },
        { id: 'a', label: 'Bone' },
        { id: 'b', label: 'Muscle' },
      ],
      edges: [
        { source: 'root', target: 'a' },
        { source: 'root', target: 'b' },
      ],
    });
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Anatomy');
    expect(result[0].back).toBe('Bone');
    expect(result[1].name).toBe('Anatomy');
    expect(result[1].back).toBe('Muscle');
  });

  it('creates cards for a tree graph', () => {
    const result = mindmapToNotes({
      nodes: [
        { id: '1', label: 'Root' },
        { id: '2', label: 'Child' },
        { id: '3', label: 'Grandchild' },
      ],
      edges: [
        { source: '1', target: '2' },
        { source: '2', target: '3' },
      ],
    });
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Root');
    expect(result[0].back).toBe('Child');
    expect(result[1].name).toBe('Child');
    expect(result[1].back).toBe('Grandchild');
  });

  it('ignores edges whose source node is missing', () => {
    const result = mindmapToNotes({
      nodes: [{ id: 'b', label: 'B' }],
      edges: [{ source: 'missing', target: 'b' }],
    });
    expect(result).toEqual([]);
  });

  it('ignores edges whose target node is missing', () => {
    const result = mindmapToNotes({
      nodes: [{ id: 'a', label: 'A' }],
      edges: [{ source: 'a', target: 'missing' }],
    });
    expect(result).toEqual([]);
  });

  it('produces valid basic notes', () => {
    const result = mindmapToNotes({
      nodes: [
        { id: '1', label: 'Q' },
        { id: '2', label: 'A' },
      ],
      edges: [{ source: '1', target: '2' }],
    });
    expect(result[0].isValidBasicNote()).toBe(true);
  });

  it('node with image produces a card whose back contains an img tag with the filename', () => {
    const result = mindmapToNotes({
      nodes: [
        { id: '1', label: 'Parent' },
        {
          id: '2',
          label: 'Child with image',
          image: { url: '/api/mindmaps/images/42/map-1/abc.png', width: 100, height: 80 },
        },
      ],
      edges: [{ source: '1', target: '2' }],
    }, { 'abc.png': 'abc.png' });

    expect(result[0].back).toContain('<img src="abc.png"');
    expect(result[0].back).toContain('Child with image');
    expect(result[0].media).toEqual(['abc.png']);
  });

  it('node with image and no filename map falls back to label only', () => {
    const result = mindmapToNotes({
      nodes: [
        { id: '1', label: 'Parent' },
        {
          id: '2',
          label: 'No map',
          image: { url: '/api/mindmaps/images/42/map-1/xyz.png', width: 100, height: 80 },
        },
      ],
      edges: [{ source: '1', target: '2' }],
    });
    expect(result[0].back).toBe('No map');
  });
});
