export interface TextAlignOption {
  key: string;
  label: string;
  value: string;
}

export const TEXT_ALIGN_OPTIONS: readonly TextAlignOption[] = [
  { key: 'default', label: 'Default', value: '' },
  { key: 'left', label: 'Left', value: 'left' },
  { key: 'center', label: 'Center', value: 'center' },
  { key: 'right', label: 'Right', value: 'right' },
];
