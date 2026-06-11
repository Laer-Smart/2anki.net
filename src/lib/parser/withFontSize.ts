const FONT_SIZE_PATTERN = /^(\d{1,3})(\.\d{1,2})?(px|em|rem|%)?$/;
const DEFAULT_FONT_SIZE = 20;

function normalizeFontSize(fontSize: string): string | null {
  const match = FONT_SIZE_PATTERN.exec(fontSize.trim());
  if (match == null) return null;

  const value = Number.parseFloat(match[1] + (match[2] ?? ''));
  if (value < 1 || value > 100) return null;

  const unit = match[3] ?? 'px';
  if (unit === 'px' && value === DEFAULT_FONT_SIZE) return null;

  return `${match[1]}${match[2] ?? ''}${unit}`;
}

export function withFontSize(style: string | null, fontSize?: string) {
  if (style && fontSize) {
    const normalized = normalizeFontSize(fontSize);
    if (normalized != null) {
      style += '\n' + `* { font-size:${normalized}}`;
    }
  }
  return style;
}
