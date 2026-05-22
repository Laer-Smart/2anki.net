import * as cheerio from 'cheerio';
import { Element } from 'domhandler';
import { randomUUID } from 'node:crypto';
import { MindmapData } from '../../../usecases/mindmaps/MindmapData';

function labelOf(el: Element): string {
  const text = el.attribs['text'];
  if (text && text.trim().length > 0) return text.trim();
  const note = el.attribs['_note'];
  if (note && note.trim().length > 0) return note.trim();
  return '';
}

export function parseOpml(xml: string): MindmapData {
  const $ = cheerio.load(xml, { xmlMode: true });

  const body = $('body');
  if (body.length === 0) {
    throw new Error('OPML document has no <body> element');
  }

  const nodes: Array<{ id: string; label: string }> = [];
  const edges: Array<{ source: string; target: string }> = [];

  function visit(el: Element, parentId: string | null) {
    const label = labelOf(el);
    if (!label) return;

    const id = randomUUID();
    nodes.push({ id, label });

    if (parentId != null) {
      edges.push({ source: parentId, target: id });
    }

    $(el)
      .children('outline')
      .each((_i, child) => {
        visit(child as Element, id);
      });
  }

  body.children('outline').each((_i, el) => {
    visit(el as Element, null);
  });

  return { nodes, edges };
}
