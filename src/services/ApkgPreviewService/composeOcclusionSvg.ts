import {
  OcclusionEllipse,
  OcclusionPolygon,
  OcclusionRect,
  OcclusionShape,
} from './parseOcclusionField';

const MASK_FILL = '#ffeba2';
const MASK_STROKE = '#e6a900';

function extractImageSource(imageField: string): string | null {
  const match = /<img\b[^>]*\bsrc="([^"]+)"/i.exec(imageField);
  return match ? match[1] : null;
}

function escapeAttr(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function rectShape(shape: OcclusionRect): string {
  return `<rect x="${shape.left}" y="${shape.top}" width="${shape.width}" height="${shape.height}" fill="${MASK_FILL}" stroke="${MASK_STROKE}" stroke-width="0.004" />`;
}

function ellipseShape(shape: OcclusionEllipse): string {
  const cx = shape.left + shape.rx;
  const cy = shape.top + shape.ry;
  return `<ellipse cx="${cx}" cy="${cy}" rx="${shape.rx}" ry="${shape.ry}" fill="${MASK_FILL}" stroke="${MASK_STROKE}" stroke-width="0.004" />`;
}

function polygonShape(shape: OcclusionPolygon): string {
  const points = shape.points.map((p) => `${p.x},${p.y}`).join(' ');
  return `<polygon points="${points}" fill="${MASK_FILL}" stroke="${MASK_STROKE}" stroke-width="0.004" />`;
}

function renderShape(shape: OcclusionShape): string {
  if (shape.kind === 'rect') return rectShape(shape);
  if (shape.kind === 'ellipse') return ellipseShape(shape);
  return polygonShape(shape);
}

export function composeOcclusionSvg(
  imageField: string,
  shapes: OcclusionShape[]
): string {
  const source = extractImageSource(imageField);
  if (source == null) return '';
  const masks = shapes.map(renderShape).join('');
  return (
    '<svg class="apkg-io-overlay" viewBox="0 0 1 1" preserveAspectRatio="none">' +
    `<image href="${escapeAttr(source)}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" />` +
    `<g>${masks}</g>` +
    '</svg>'
  );
}
