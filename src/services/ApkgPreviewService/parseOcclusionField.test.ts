import { parseOcclusionField } from './parseOcclusionField';

describe('parseOcclusionField', () => {
  it('parses a single rect shape with fractional coordinates', () => {
    const field = 'rect:left=0.1:top=0.2:width=0.3:height=0.4:oi=1';
    expect(parseOcclusionField(field)).toEqual([
      { kind: 'rect', left: 0.1, top: 0.2, width: 0.3, height: 0.4, oi: 1 },
    ]);
  });

  it('parses an ellipse shape with rx/ry radii', () => {
    const field = 'ellipse:left=0.25:top=0.3:rx=0.1:ry=0.05:oi=2';
    expect(parseOcclusionField(field)).toEqual([
      { kind: 'ellipse', left: 0.25, top: 0.3, rx: 0.1, ry: 0.05, oi: 2 },
    ]);
  });

  it('parses a polygon shape with a points list', () => {
    const field = 'polygon:points=0.1,0.2 0.3,0.4 0.5,0.1:oi=3';
    expect(parseOcclusionField(field)).toEqual([
      {
        kind: 'polygon',
        points: [
          { x: 0.1, y: 0.2 },
          { x: 0.3, y: 0.4 },
          { x: 0.5, y: 0.1 },
        ],
        oi: 3,
      },
    ]);
  });

  it('parses multiple masks separated by newlines', () => {
    const field =
      'rect:left=0.1:top=0.2:width=0.3:height=0.4:oi=1\nellipse:left=0.5:top=0.6:rx=0.1:ry=0.1:oi=2';
    const result = parseOcclusionField(field);
    expect(result).toHaveLength(2);
    expect(result[0].kind).toBe('rect');
    expect(result[1].kind).toBe('ellipse');
  });

  it('parses multiple masks separated by <br> markup', () => {
    const field =
      'rect:left=0.1:top=0.2:width=0.3:height=0.4:oi=1<br>rect:left=0.5:top=0.6:width=0.1:height=0.1:oi=2';
    expect(parseOcclusionField(field)).toHaveLength(2);
  });

  it('ignores blank lines and unknown shape kinds', () => {
    const field =
      '\nrect:left=0.1:top=0.2:width=0.3:height=0.4:oi=1\nstar:left=0.1:top=0.2\n';
    expect(parseOcclusionField(field)).toEqual([
      { kind: 'rect', left: 0.1, top: 0.2, width: 0.3, height: 0.4, oi: 1 },
    ]);
  });

  it('drops a rect missing required geometry', () => {
    const field = 'rect:left=0.1:top=0.2:oi=1';
    expect(parseOcclusionField(field)).toEqual([]);
  });

  it('returns an empty list for empty or non-string input', () => {
    expect(parseOcclusionField('')).toEqual([]);
    expect(parseOcclusionField('   ')).toEqual([]);
  });
});
