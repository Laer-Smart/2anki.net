import type {
  FieldMapping,
  FieldMappingEntry,
} from '../../lib/cardFields/types';

const BASIC_FIELDS: FieldMappingEntry[] = [
  { name: 'Front', instruction: 'The question, term, or concept being tested' },
  { name: 'Back', instruction: 'The answer, definition, or explanation' },
];

const CLOZE_FIELDS: FieldMappingEntry[] = [
  {
    name: 'Text',
    instruction: 'The sentence with cloze deletions using {{c1::...}} syntax',
  },
  { name: 'Extra', instruction: 'Optional extra context or hint for the card' },
];

const MCQ_FIELDS: FieldMappingEntry[] = [
  { name: 'Question', instruction: 'The multiple-choice question' },
  { name: 'A', instruction: 'First answer choice' },
  { name: 'B', instruction: 'Second answer choice' },
  { name: 'C', instruction: 'Third answer choice' },
  { name: 'D', instruction: 'Fourth answer choice' },
  { name: 'Answer', instruction: 'The correct answer letter (A, B, C, or D)' },
];

export const FIELD_MAPPING_DEFAULTS: Record<string, FieldMapping> = {
  'n2a-basic': { templateName: 'n2a-basic', fields: BASIC_FIELDS },
  'n2a-cloze': { templateName: 'n2a-cloze', fields: CLOZE_FIELDS },
  'n2a-mcq': { templateName: 'n2a-mcq', fields: MCQ_FIELDS },
  specialstyle: { templateName: 'specialstyle', fields: BASIC_FIELDS },
  notionstyle: { templateName: 'notionstyle', fields: BASIC_FIELDS },
  nostyle: { templateName: 'nostyle', fields: BASIC_FIELDS },
  abhiyan: { templateName: 'abhiyan', fields: BASIC_FIELDS },
  alex_deluxe: { templateName: 'alex_deluxe', fields: BASIC_FIELDS },
};

export function getDefaultFieldMapping(
  templateName: string
): FieldMapping | null {
  return FIELD_MAPPING_DEFAULTS[templateName] ?? null;
}
