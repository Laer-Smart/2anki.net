export const TRANSFORM_NAMES = [
  'translate_back',
  'add_example',
  'cloze_front',
  'add_hint',
] as const;

export type TransformName = (typeof TRANSFORM_NAMES)[number];

export type SourceModelKind = 'basic' | 'cloze';

export interface ParsedNote {
  guid: string;
  modelKind: SourceModelKind;
  front: string;
  back: string;
  tags: string[];
}

export interface TransformedNote {
  guid: string;
  modelKind: SourceModelKind;
  front: string;
  back: string;
  hint?: string;
  tags: string[];
}

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
