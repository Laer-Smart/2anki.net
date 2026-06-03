import hljs from 'highlight.js';

import { escapeHtml } from './escape';

const NOTION_LANGUAGE_ALIASES: Record<string, string> = {
  'c++': 'cpp',
  'c#': 'csharp',
  'f#': 'fsharp',
  'objective-c': 'objectivec',
  'plain text': 'plaintext',
  'visual basic': 'vbnet',
  'vb.net': 'vbnet',
  shell: 'bash',
  docker: 'dockerfile',
  'java/c/c++/c#': 'cpp',
};

const normalizeLanguage = (language: string): string => {
  const lower = language.trim().toLowerCase();
  return NOTION_LANGUAGE_ALIASES[lower] ?? lower;
};

export const highlightCode = (code: string, language?: string): string => {
  if (language == null || language === '') return escapeHtml(code);

  const normalized = normalizeLanguage(language);
  if (normalized === 'plaintext' || hljs.getLanguage(normalized) == null) {
    return escapeHtml(code);
  }

  return hljs.highlight(code, { language: normalized, ignoreIllegals: true }).value;
};
