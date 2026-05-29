export const TRANSFORM_NAMES = [
  'translate_back',
  'add_example',
  'cloze_front',
  'add_hint',
  'add_image',
] as const;

export type TransformName = (typeof TRANSFORM_NAMES)[number];

export const IMAGE_SOURCES = ['pexels', 'wikimedia'] as const;

export type ImageSource = (typeof IMAGE_SOURCES)[number];

export type SourceModelKind = 'basic' | 'cloze';

export interface ParsedNote {
  guid: string;
  modelKind: SourceModelKind;
  modelName: string;
  fields: string[];
  fieldNames: string[];
  tags: string[];
}

export interface TransformedNote {
  guid: string;
  modelKind: SourceModelKind;
  modelName: string;
  fields: string[];
  fieldNames: string[];
  tags: string[];
  hint?: string;
  media?: string[];
}

export interface FieldSelection {
  sourceField?: number;
  targetField?: number;
}

export const getFrontField = (note: ParsedNote): string => note.fields[0] ?? '';

export const getBackField = (note: ParsedNote): string => note.fields[1] ?? '';

export interface TransformOptions {
  transform: TransformName;
  targetLanguage?: string;
}

export const SUPPORTED_TARGET_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Italian',
  'Dutch',
  'Norwegian',
  'Swedish',
  'Polish',
  'Japanese',
  'Korean',
  'Mandarin Chinese',
  'Arabic',
  'Hindi',
] as const;

export type TargetLanguage = (typeof SUPPORTED_TARGET_LANGUAGES)[number];

export function isTransformName(value: unknown): value is TransformName {
  return (
    typeof value === 'string' &&
    (TRANSFORM_NAMES as readonly string[]).includes(value)
  );
}

export function isTargetLanguage(value: unknown): value is TargetLanguage {
  return (
    typeof value === 'string' &&
    (SUPPORTED_TARGET_LANGUAGES as readonly string[]).includes(value)
  );
}
