import type { Heading, InputFormat } from './types';
import { detectMarkdown } from './detectMarkdown';
import { detectHtml } from './detectHtml';

export function detect(format: InputFormat, source: string): Heading[] {
  if (format === 'markdown') {
    return detectMarkdown(source);
  }
  return detectHtml(source);
}
