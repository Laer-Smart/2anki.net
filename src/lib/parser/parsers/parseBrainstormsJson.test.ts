import { parseBrainstormsJson } from './parseBrainstormsJson';

describe('parseBrainstormsJson', () => {
  it('produces edges for each source→target pair (star tree)', () => {
    const input = JSON.stringify({
      nodes: [
        { id: '1', label: 'Root' },
        { id: '2', label: 'A' },
        { id: '3', label: 'B' },
      ],
      edges: [
        { source: '1', target: '2' },
        { source: '1', target: '3' },
      ],
    });
    const result = parseBrainstormsJson(input);
    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);
    expect(result.nodes.map((n) => n.label)).toEqual(
      expect.arrayContaining(['Root', 'A', 'B'])
    );
  });

  it('returns empty nodes and edges for an empty graph', () => {
    const input = JSON.stringify({ nodes: [], edges: [] });
    const result = parseBrainstormsJson(input);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('throws when the JSON is malformed', () => {
    expect(() => parseBrainstormsJson('{not valid json')).toThrow();
  });

  it('throws when nodes array is missing', () => {
    const input = JSON.stringify({ edges: [] });
    expect(() => parseBrainstormsJson(input)).toThrow();
  });

  it('throws when edges array is missing', () => {
    const input = JSON.stringify({ nodes: [] });
    expect(() => parseBrainstormsJson(input)).toThrow();
  });

  it('preserves node id and label from input', () => {
    const input = JSON.stringify({
      nodes: [{ id: 'abc', label: 'My topic' }],
      edges: [],
    });
    const result = parseBrainstormsJson(input);
    expect(result.nodes[0]).toEqual({ id: 'abc', label: 'My topic' });
  });

  it('handles nested tree (multiple levels)', () => {
    const input = JSON.stringify({
      nodes: [
        { id: '1', label: 'Root' },
        { id: '2', label: 'Branch' },
        { id: '3', label: 'Leaf' },
      ],
      edges: [
        { source: '1', target: '2' },
        { source: '2', target: '3' },
      ],
    });
    const result = parseBrainstormsJson(input);
    expect(result.edges).toHaveLength(2);
  });
});
