import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';

function isListElement(node: AnyNode | null): node is Element {
  return (
    node != null &&
    node.type === 'tag' &&
    (node.name === 'ul' || node.name === 'ol')
  );
}

function isWhitespaceText(node: AnyNode): boolean {
  return node.type === 'text' && !node.data.trim();
}

function isDisplayContentsDiv(node: AnyNode): boolean {
  if (node.type !== 'tag' || node.name !== 'div') {
    return false;
  }
  const style = node.attribs?.style ?? '';
  return style.replace(/\s+/g, '').includes('display:contents');
}

function resolveToList(dom: cheerio.CheerioAPI, node: AnyNode): Element | null {
  if (isListElement(node)) {
    return node;
  }
  if (isDisplayContentsDiv(node)) {
    const child = dom(node).children('ul, ol').first();
    if (child.length > 0) {
      return child[0];
    }
  }
  return null;
}

function pushTopLevelItems(
  dom: cheerio.CheerioAPI,
  list: Element,
  items: string[]
): void {
  dom(list)
    .children('li')
    .each((_index, element) => {
      const $item = dom(element).clone();
      $item.find('ul, ol').remove();
      const inner = $item.html();
      if (inner && inner.trim()) {
        items.push(inner.trim());
      }
    });
}

function regionStartNode(firstList: Element): AnyNode {
  const parent = firstList.parent;
  if (parent && parent.type === 'tag' && isDisplayContentsDiv(parent)) {
    return parent;
  }
  return firstList;
}

export default function extractListItems(html: string): string[] {
  if (!html || !html.trim()) {
    return [];
  }

  const dom = cheerio.load(html);
  const firstList = dom('ul, ol').first();
  if (firstList.length === 0) {
    return [];
  }

  const items: string[] = [];
  const start = regionStartNode(firstList[0]);

  let cursor: AnyNode | null = start;
  while (cursor) {
    if (isWhitespaceText(cursor)) {
      cursor = cursor.nextSibling;
      continue;
    }
    const list = resolveToList(dom, cursor);
    if (!list) {
      break;
    }
    pushTopLevelItems(dom, list, items);
    cursor = cursor.nextSibling;
  }

  return items;
}
