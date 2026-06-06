export interface OcclusionRect {
  kind: 'rect';
  left: number;
  top: number;
  width: number;
  height: number;
  oi: number;
}

export interface OcclusionEllipse {
  kind: 'ellipse';
  left: number;
  top: number;
  rx: number;
  ry: number;
  oi: number;
}

export interface OcclusionPolygon {
  kind: 'polygon';
  points: { x: number; y: number }[];
  oi: number;
}

export type OcclusionShape =
  | OcclusionRect
  | OcclusionEllipse
  | OcclusionPolygon;

const ENTRY_SEPARATOR = /<br\s*\/?>|\r?\n/i;

function parseKeyValues(parts: string[]): Map<string, string> {
  const values = new Map<string, string>();
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    values.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
  }
  return values;
}

function readNumber(values: Map<string, string>, key: string): number | null {
  const raw = values.get(key);
  if (raw == null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function readIndex(values: Map<string, string>): number {
  const oi = readNumber(values, 'oi');
  return oi == null ? 0 : oi;
}

function parseRect(values: Map<string, string>): OcclusionRect | null {
  const left = readNumber(values, 'left');
  const top = readNumber(values, 'top');
  const width = readNumber(values, 'width');
  const height = readNumber(values, 'height');
  if (left == null || top == null || width == null || height == null) {
    return null;
  }
  return { kind: 'rect', left, top, width, height, oi: readIndex(values) };
}

function parseEllipse(values: Map<string, string>): OcclusionEllipse | null {
  const left = readNumber(values, 'left');
  const top = readNumber(values, 'top');
  const rx = readNumber(values, 'rx');
  const ry = readNumber(values, 'ry');
  if (left == null || top == null || rx == null || ry == null) {
    return null;
  }
  return { kind: 'ellipse', left, top, rx, ry, oi: readIndex(values) };
}

function parsePoints(raw: string | undefined): { x: number; y: number }[] {
  if (raw == null) return [];
  const points: { x: number; y: number }[] = [];
  for (const pair of raw.split(/\s+/)) {
    const [xPart, yPart] = pair.split(',');
    const x = Number(xPart);
    const y = Number(yPart);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      points.push({ x, y });
    }
  }
  return points;
}

function parsePolygon(values: Map<string, string>): OcclusionPolygon | null {
  const points = parsePoints(values.get('points'));
  if (points.length < 3) return null;
  return { kind: 'polygon', points, oi: readIndex(values) };
}

function parseEntry(entry: string): OcclusionShape | null {
  const segments = entry.split(':');
  const kind = segments[0]?.trim().toLowerCase();
  const values = parseKeyValues(segments.slice(1));
  if (kind === 'rect') return parseRect(values);
  if (kind === 'ellipse') return parseEllipse(values);
  if (kind === 'polygon') return parsePolygon(values);
  return null;
}

export function parseOcclusionField(field: string): OcclusionShape[] {
  if (typeof field !== 'string') return [];
  const shapes: OcclusionShape[] = [];
  for (const entry of field.split(ENTRY_SEPARATOR)) {
    const trimmed = entry.trim();
    if (trimmed.length === 0) continue;
    const shape = parseEntry(trimmed);
    if (shape) shapes.push(shape);
  }
  return shapes;
}
