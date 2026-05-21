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

export const markdownToHTML = (
  html: string,
  trimWhitespace: boolean = false
) => {
  const input = trimWhitespace ? html.trim() : html;
  return md.render(input);
};
