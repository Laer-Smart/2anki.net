import { parseOpml } from './parseOpml';

describe('parseOpml', () => {
  it('returns empty data for an empty outline', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>Empty</title></head>
  <body>
    <outline text="Root"/>
  </body>
</opml>`;
    const result = parseOpml(xml);
    expect(result.nodes.length).toBe(1);
    expect(result.edges.length).toBe(0);
  });

  it('produces one edge per parent→child pair (star tree)', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="Brachial plexus">
      <outline text="C5"/>
      <outline text="C6"/>
      <outline text="C7"/>
    </outline>
  </body>
</opml>`;
    const result = parseOpml(xml);
    expect(result.nodes.map((n) => n.label)).toEqual(
      expect.arrayContaining(['Brachial plexus', 'C5', 'C6', 'C7'])
    );
    expect(result.edges).toHaveLength(3);
    const rootId = result.nodes.find((n) => n.label === 'Brachial plexus')!.id;
    const edgeSources = result.edges.map((e) => e.source);
    expect(edgeSources.every((s) => s === rootId)).toBe(true);
  });

  it('handles nested tree producing one edge per connection', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="Root">
      <outline text="Branch">
        <outline text="Leaf"/>
      </outline>
    </outline>
  </body>
</opml>`;
    const result = parseOpml(xml);
    expect(result.edges).toHaveLength(2);
    const nodeLabels = result.nodes.map((n) => n.label);
    expect(nodeLabels).toContain('Root');
    expect(nodeLabels).toContain('Branch');
    expect(nodeLabels).toContain('Leaf');
  });

  it('throws on malformed XML', () => {
    expect(() => parseOpml('<not valid xml<<')).toThrow();
  });

  it('uses _note attribute as fallback when text is absent', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline _note="Parent note">
      <outline _note="Child note"/>
    </outline>
  </body>
</opml>`;
    const result = parseOpml(xml);
    const labels = result.nodes.map((n) => n.label);
    expect(labels).toContain('Parent note');
    expect(labels).toContain('Child note');
    expect(result.edges).toHaveLength(1);
  });

  it('skips outline nodes with no text or _note', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="Root">
      <outline/>
      <outline text="Child"/>
    </outline>
  </body>
</opml>`;
    const result = parseOpml(xml);
    const labels = result.nodes.map((n) => n.label);
    expect(labels).not.toContain('');
    expect(labels).toContain('Root');
    expect(labels).toContain('Child');
  });
});
