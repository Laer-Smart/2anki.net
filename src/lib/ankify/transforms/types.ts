export type SourceModelKind = 'basic' | 'cloze';

export interface ParsedNote {
  guid: string;
  modelKind: SourceModelKind;
  modelName: string;
  fields: string[];
  fieldNames: string[];
  frontFieldIndex?: number;
  backFieldIndex?: number;
  tags: string[];
}
