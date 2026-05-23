export type ChatCardTemplate =
  | 'basic'
  | 'basic-and-reversed'
  | 'cloze'
  | 'mcq';

export interface ChatTemplateOption {
  slug: ChatCardTemplate;
  label: string;
  fieldHint: string;
}

export const CHAT_TEMPLATE_OPTIONS: ChatTemplateOption[] = [
  { slug: 'basic', label: 'Basic', fieldHint: 'Front / Back' },
  { slug: 'basic-and-reversed', label: 'Basic + Reverse', fieldHint: 'Front / Back (both directions)' },
  { slug: 'cloze', label: 'Cloze', fieldHint: 'Front with {{c1::blanks}}' },
  { slug: 'mcq', label: 'Multiple choice', fieldHint: 'Stem with four options' },
];

export const DEFAULT_TEMPLATE: ChatCardTemplate = 'basic';
