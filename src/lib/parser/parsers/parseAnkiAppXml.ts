import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';

import Note from '../Note';
import { markdownToHTML } from '../../markdown';
import { sanitizeCardHtml } from '../../../services/ApkgPreviewService/sanitize';

export const ANKI_APP_MALFORMED_XML_MESSAGE =
  "Couldn't read this AnkiApp export — the XML is malformed. Re-export the deck from AnkiApp and try again.";

export const ANKI_APP_NO_CARDS_MESSAGE =
  'No cards found in this AnkiApp export. Check that the deck has cards in AnkiApp, then re-export.';

export class AnkiAppExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnkiAppExportError';
  }
}

export interface AnkiAppDeck {
  name: string;
  notes: Note[];
  skippedMediaOnlyCount: number;
}

interface FieldDefinition {
  type: string;
  sides?: string;
}

interface RenderedField {
  html: string;
  sides?: string;
}

const MEDIA_FIELD_TYPES = new Set(['audio', 'img', 'image', 'video']);

const KNOWN_FIELD_TYPES = new Set([
  'tts',
  'text',
  'rich-text',
  'markdown',
  'code',
  'tex',
  'japanese',
  'translation',
  'chinese',
  ...MEDIA_FIELD_TYPES,
]);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseTagList(raw: string | undefined): string[] {
  if (raw == null) return [];
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function readFieldDefinitions(
  $: cheerio.CheerioAPI,
  deck: cheerio.Cheerio<Element>
): Map<string, FieldDefinition> {
  const definitions = new Map<string, FieldDefinition>();
  deck
    .children('fields')
    .children()
    .each((_i, el) => {
      const name = el.attribs['name'];
      if (name == null) return;
      definitions.set(name, {
        type: el.tagName.toLowerCase(),
        sides: el.attribs['sides'],
      });
    });
  return definitions;
}

function resolveFieldValue(
  $: cheerio.CheerioAPI,
  fieldEl: Element,
  definition: FieldDefinition | undefined
): { type: string; valueEl: Element } {
  const elementChildren = $(fieldEl).children().toArray();
  const onlyChild = elementChildren.length === 1 ? elementChildren[0] : null;
  if (
    onlyChild != null &&
    KNOWN_FIELD_TYPES.has(onlyChild.tagName.toLowerCase())
  ) {
    return { type: onlyChild.tagName.toLowerCase(), valueEl: onlyChild };
  }
  return { type: definition?.type ?? 'text', valueEl: fieldEl };
}

function renderPlainText(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(escapeHtml)
    .join('<br>');
}

function renderFieldHtml(
  $: cheerio.CheerioAPI,
  valueEl: Element,
  type: string
): string {
  if (type === 'rich-text') {
    return sanitizeCardHtml($(valueEl).html() ?? '').trim();
  }
  if (type === 'markdown') {
    return markdownToHTML($(valueEl).text(), true).trim();
  }
  return renderPlainText($(valueEl).text());
}

function splitBySides(
  parts: RenderedField[]
): { front: RenderedField[]; back: RenderedField[] } | null {
  const sided = parts.every(
    (part) => part.sides != null && /^[01]{2,}$/.test(part.sides)
  );
  if (!sided) return null;

  const front = parts.filter((part) => part.sides![0] === '1');
  const back = parts.filter(
    (part) => part.sides![1] === '1' && part.sides![0] !== '1'
  );
  if (front.length === 0 || back.length === 0) return null;
  return { front, back };
}

function joinParts(parts: RenderedField[]): string {
  return parts.map((part) => part.html).join('<br>');
}

function buildNote(parts: RenderedField[], tags: string[]): Note | null {
  const sided = splitBySides(parts) ?? {
    front: parts.slice(0, 1),
    back: parts.slice(1),
  };
  const front = joinParts(sided.front);
  const back = joinParts(sided.back);
  if (front.length === 0 || back.length === 0) return null;

  const note = new Note(front, back);
  note.tags = tags;
  return note;
}

export function parseAnkiAppXml(xml: string): AnkiAppDeck {
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(xml, { xmlMode: true });
  } catch {
    throw new AnkiAppExportError(ANKI_APP_MALFORMED_XML_MESSAGE);
  }

  const deck = $('deck').first();
  if (deck.length === 0) {
    throw new AnkiAppExportError(ANKI_APP_MALFORMED_XML_MESSAGE);
  }

  const definitions = readFieldDefinitions($, deck);
  const deckTags = parseTagList(deck.attr('tags'));

  const cards = deck.find('card').toArray();
  if (cards.length === 0) {
    throw new AnkiAppExportError(ANKI_APP_NO_CARDS_MESSAGE);
  }

  const notes: Note[] = [];
  let skippedMediaOnlyCount = 0;

  for (const card of cards) {
    const parts: RenderedField[] = [];
    let hadMediaField = false;

    $(card)
      .children('field')
      .each((_i, fieldEl) => {
        const name = fieldEl.attribs['name'];
        const definition = name == null ? undefined : definitions.get(name);
        const { type, valueEl } = resolveFieldValue($, fieldEl, definition);
        if (MEDIA_FIELD_TYPES.has(type)) {
          hadMediaField = true;
          return;
        }
        const html = renderFieldHtml($, valueEl, type);
        if (html.length === 0) return;
        parts.push({ html, sides: definition?.sides });
      });

    const cardTags = parseTagList((card as Element).attribs['tags']);
    const note = buildNote(parts, [...deckTags, ...cardTags]);
    if (note != null) {
      notes.push(note);
    } else if (hadMediaField) {
      skippedMediaOnlyCount++;
    }
  }

  if (notes.length === 0) {
    throw new AnkiAppExportError(ANKI_APP_NO_CARDS_MESSAGE);
  }

  return {
    name: (deck.attr('name') ?? '').trim(),
    notes,
    skippedMediaOnlyCount,
  };
}
