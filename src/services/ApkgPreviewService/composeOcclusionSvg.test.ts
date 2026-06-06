import { composeOcclusionSvg } from './composeOcclusionSvg';
import { sanitizeCardHtml } from './sanitize';

describe('composeOcclusionSvg', () => {
  const imageRef = '<img src="brain.png">';

  it('embeds the base image as an svg image href', () => {
    const svg = composeOcclusionSvg(imageRef, [
      { kind: 'rect', left: 0.1, top: 0.2, width: 0.3, height: 0.4, oi: 1 },
    ]);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<image');
    expect(svg).toContain('href="brain.png"');
  });

  it('uses a 0..1 viewBox so masks land independent of display size', () => {
    const svg = composeOcclusionSvg(imageRef, [
      { kind: 'rect', left: 0.1, top: 0.2, width: 0.3, height: 0.4, oi: 1 },
    ]);
    expect(svg).toContain('viewBox="0 0 1 1"');
    expect(svg).toContain('preserveAspectRatio="none"');
  });

  it('draws a rect mask at the parsed fractional coordinates', () => {
    const svg = composeOcclusionSvg(imageRef, [
      { kind: 'rect', left: 0.1, top: 0.2, width: 0.3, height: 0.4, oi: 1 },
    ]);
    expect(svg).toContain('<rect');
    expect(svg).toContain('x="0.1"');
    expect(svg).toContain('y="0.2"');
    expect(svg).toContain('width="0.3"');
    expect(svg).toContain('height="0.4"');
  });

  it('draws an ellipse mask at its center with rx/ry', () => {
    const svg = composeOcclusionSvg(imageRef, [
      { kind: 'ellipse', left: 0.25, top: 0.3, rx: 0.1, ry: 0.05, oi: 1 },
    ]);
    expect(svg).toContain('<ellipse');
    expect(svg).toContain('cx="0.35"');
    expect(svg).toContain('cy="0.35"');
    expect(svg).toContain('rx="0.1"');
    expect(svg).toContain('ry="0.05"');
  });

  it('draws a polygon mask from its points list', () => {
    const svg = composeOcclusionSvg(imageRef, [
      {
        kind: 'polygon',
        points: [
          { x: 0.1, y: 0.2 },
          { x: 0.3, y: 0.4 },
          { x: 0.5, y: 0.1 },
        ],
        oi: 1,
      },
    ]);
    expect(svg).toContain('<polygon');
    expect(svg).toContain('points="0.1,0.2 0.3,0.4 0.5,0.1"');
  });

  it('renders every mask for a multi-mask card', () => {
    const svg = composeOcclusionSvg(imageRef, [
      { kind: 'rect', left: 0.1, top: 0.2, width: 0.3, height: 0.4, oi: 1 },
      { kind: 'rect', left: 0.5, top: 0.6, width: 0.1, height: 0.1, oi: 2 },
    ]);
    expect(svg.match(/<rect/g)).toHaveLength(2);
  });

  it('returns an empty string when there is no image reference', () => {
    expect(
      composeOcclusionSvg('', [
        { kind: 'rect', left: 0.1, top: 0.2, width: 0.3, height: 0.4, oi: 1 },
      ])
    ).toBe('');
  });

  it('produces markup the existing sanitizer keeps intact', () => {
    const svg = composeOcclusionSvg(imageRef, [
      { kind: 'rect', left: 0.1, top: 0.2, width: 0.3, height: 0.4, oi: 1 },
    ]);
    const cleaned = sanitizeCardHtml(svg);
    expect(cleaned).toContain('<svg');
    expect(cleaned).toContain('<image');
    expect(cleaned).toContain('<rect');
  });

  it('never emits a script or canvas element or an on* handler', () => {
    const svg = composeOcclusionSvg(imageRef, [
      { kind: 'rect', left: 0.1, top: 0.2, width: 0.3, height: 0.4, oi: 1 },
    ]);
    expect(svg).not.toContain('<script');
    expect(svg).not.toContain('<canvas');
    expect(svg).not.toMatch(/\son[a-z]+=/i);
  });
});
