export type SourceUnitRole =
  | 'title'
  | 'bullet'
  | 'body'
  | 'note'
  | 'table'
  | 'image';

export interface SourceUnit {
  id: string;
  visibleText: string;
  speakerNotes: string;
  role: SourceUnitRole;
}
