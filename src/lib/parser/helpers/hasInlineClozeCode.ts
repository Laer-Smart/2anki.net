import * as cheerio from 'cheerio';

export default function hasInlineClozeCode(html: string): boolean {
  if (!html.includes('<code')) {
    return false;
  }
  const dom = cheerio.load(html);
  return dom('code').toArray().some((el) => dom(el).parents('pre').length === 0);
}
