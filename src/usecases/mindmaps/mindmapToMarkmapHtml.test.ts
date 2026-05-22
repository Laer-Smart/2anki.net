import { mindmapToMarkmapHtml } from './mindmapToMarkmapHtml';

const fiveNodeTree = {
  nodes: [
    { id: '1', label: 'Root' },
    { id: '2', label: 'A' },
    { id: '3', label: 'B' },
    { id: '4', label: 'C' },
    { id: '5', label: 'D' },
  ],
  edges: [
    { source: '1', target: '2' },
    { source: '1', target: '3' },
    { source: '2', target: '4' },
    { source: '2', target: '5' },
  ],
};

const thirtyNodeTree = (() => {
  const nodes = [{ id: '1', label: 'Root' }];
  const edges = [];
  for (let i = 2; i <= 30; i++) {
    nodes.push({ id: String(i), label: `Node ${i}` });
    const parentId = String(Math.floor(i / 2));
    edges.push({ source: parentId, target: String(i) });
  }
  return { nodes, edges };
})();

describe('mindmapToMarkmapHtml', () => {
  it('returns a string containing the deck title', () => {
    const html = mindmapToMarkmapHtml(fiveNodeTree, 'My Deck');
    expect(typeof html).toBe('string');
    expect(html).toContain('My Deck');
  });

  it('contains a self-contained SVG element', () => {
    const html = mindmapToMarkmapHtml(fiveNodeTree, 'Test');
    expect(html).toContain('<svg');
    expect(html).toContain('markmap');
  });

  it('embeds the tree data as JSON', () => {
    const html = mindmapToMarkmapHtml(fiveNodeTree, 'Test');
    expect(html).toContain('"Root"');
    expect(html).toContain('"children"');
  });

  it('handles a 30-node tree without throwing', () => {
    const html = mindmapToMarkmapHtml(thirtyNodeTree, 'Large Map');
    expect(html).toContain('Root');
    expect(html.length).toBeGreaterThan(10000);
  });

  it('handles an empty tree gracefully', () => {
    const html = mindmapToMarkmapHtml({ nodes: [], edges: [] }, 'Empty');
    expect(html).toContain('null');
    expect(html).toContain('Empty mind map');
  });

  it('inlines the d3 and markmap scripts (no src= references to those libs)', () => {
    const html = mindmapToMarkmapHtml(fiveNodeTree, 'Test');
    expect(html).not.toContain('src="https://');
    expect(html).not.toContain("src='https://");
  });

  it('escapes HTML in node labels', () => {
    const html = mindmapToMarkmapHtml(
      {
        nodes: [{ id: '1', label: '<b>Bold</b>' }],
        edges: [],
      },
      'Test'
    );
    expect(html).not.toContain('<b>Bold</b>');
    expect(html).toContain('&lt;b&gt;');
  });
});
