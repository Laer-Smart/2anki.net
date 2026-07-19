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

const CARD_SAFE_TAGS = 'ruby|rt|rp|rb|details|summary';
const ESCAPED_CARD_SAFE_TAG_RE = new RegExp(
  `&lt;(/?(?:${CARD_SAFE_TAGS}))&gt;`,
  'gi'
);

const restoreCardSafeTags = (html: string): string =>
  html.replace(ESCAPED_CARD_SAFE_TAG_RE, '<$1>');

export const markdownToHTML = (
  html: string,
  trimWhitespace: boolean = false
) => {
  const stripped = html.replace(ASIDE_TAG_RE, '');
  const input = trimWhitespace ? stripped.trim() : stripped;
  return restoreCardSafeTags(md.render(input));
};

export const markdownToInlineHTML = (text: string) =>
  restoreCardSafeTags(md.renderInline(text));
