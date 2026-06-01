import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';

function isDisplayContentsDiv(node: AnyNode): boolean {
  if (node.type !== 'tag' || node.name !== 'div') {
    return false;
  }
  const style = node.attribs?.style ?? '';
  return style.replace(/\s+/g, '').includes('display:contents');
}

function isLineElement(node: AnyNode | null): node is Element {
  return (
    node != null &&
    node.type === 'tag' &&
    (node.name === 'p' || node.name === 'blockquote')
  );
}

function resolveToLine(dom: cheerio.CheerioAPI, node: AnyNode): Element | null {
  if (isLineElement(node)) {
    return node;
  }
  if (isDisplayContentsDiv(node)) {
    const child = dom(node).children('p, blockquote').first();
    if (child.length > 0) {
      return child[0];
    }
  }
  return null;
}

export default function extractTextLines(html: string): string[] {
  if (!html || !html.trim()) {
    return [];
  }

  const dom = cheerio.load(html);
  const lines: string[] = [];

  dom('body')
    .children()
    .each((_index, node) => {
      const line = resolveToLine(dom, node);
      if (!line) {
        return;
      }
      const text = dom(line).text().trim();
      if (text) {
        lines.push(text);
      }
    });

  return lines;
}
