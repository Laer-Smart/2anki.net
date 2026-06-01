import * as cheerio from 'cheerio';

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
  firstList.children('li').each((_index, element) => {
    const $item = dom(element).clone();
    $item.find('ul, ol').remove();
    const inner = $item.html();
    if (inner && inner.trim()) {
      items.push(inner.trim());
    }
  });

  return items;
}
