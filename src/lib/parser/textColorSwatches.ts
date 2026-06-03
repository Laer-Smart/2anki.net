export interface TextColorSwatch {
  readonly key: string;
  readonly label: string;
  readonly hex: string;
}

export const TEXT_COLOR_SWATCHES: readonly TextColorSwatch[] = [
  { key: 'default', label: 'Default', hex: '' },
  { key: 'blue', label: 'Blue', hex: '#1f6feb' },
  { key: 'green', label: 'Green', hex: '#1a7f37' },
  { key: 'red', label: 'Red', hex: '#d1242f' },
  { key: 'amber', label: 'Amber', hex: '#9a6700' },
  { key: 'purple', label: 'Purple', hex: '#8250df' },
  { key: 'teal', label: 'Teal', hex: '#0e7490' },
  { key: 'pink', label: 'Pink', hex: '#bf3989' },
];

const ALLOWED_HEXES = new Set(
  TEXT_COLOR_SWATCHES.map((swatch) => swatch.hex.toLowerCase()).filter(
    (hex) => hex !== ''
  )
);

export function isValidTextColor(value: string | undefined | null): boolean {
  if (value == null || value === '') return false;
  return ALLOWED_HEXES.has(value.toLowerCase());
}
