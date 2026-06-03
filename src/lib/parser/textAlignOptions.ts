export interface TextAlignOption {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

export const TEXT_ALIGN_OPTIONS: readonly TextAlignOption[] = [
  { key: 'default', label: 'Default', value: '' },
  { key: 'left', label: 'Left', value: 'left' },
  { key: 'center', label: 'Center', value: 'center' },
  { key: 'right', label: 'Right', value: 'right' },
];

const ALLOWED_ALIGNMENTS = new Set(
  TEXT_ALIGN_OPTIONS.map((option) => option.value).filter(
    (value) => value !== ''
  )
);

export function isValidTextAlign(value: string | undefined | null): boolean {
  if (value == null || value === '') return false;
  return ALLOWED_ALIGNMENTS.has(value);
}
