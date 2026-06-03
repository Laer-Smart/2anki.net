import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import multimdTable from 'markdown-it-multimd-table';

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: false,
  xhtmlOut: true,
})
  .use(multimdTable)
  .use(taskLists);

const ASIDE_TAG_RE = /^<\/?aside[^>]*>\s*$/gim;

export const markdownToHTML = (
  html: string,
  trimWhitespace: boolean = false
) => {
  const stripped = html.replace(ASIDE_TAG_RE, '');
  const input = trimWhitespace ? stripped.trim() : stripped;
  return md.render(input);
};

export const markdownToInlineHTML = (text: string) => md.renderInline(text);
