import { extractApkg, parseMediaManifest } from './extractApkg';
import { parseCollection } from './parseCollection';
import { applyClozeToFields } from './renderCloze';
import {
  buildFieldMap,
  renderTemplate,
  TemplateSpecials,
} from './renderTemplate';
import { rewriteMediaRefs } from './rewriteMedia';
import { sanitizeCardHtml, sanitizeCss } from './sanitize';
import {
  DeckMeta,
  NormalizedCollection,
  PreviewMeta,
  RenderedCard,
} from './types';

const MAX_CACHE_ENTRIES = 8;
const CACHE_TTL_MS = 10 * 60 * 1000;

export interface ParsedApkg {
  collection: NormalizedCollection;
  mediaMap: Map<string, string>;
  mediaEntries: Map<string, Buffer>;
  parsedAt: number;
}

export default class ApkgPreviewService {
  private readonly cache = new Map<string, ParsedApkg>();

  async parse(cacheKey: string, bytes: Buffer): Promise<ParsedApkg> {
    const existing = this.cache.get(cacheKey);
    if (existing && Date.now() - existing.parsedAt < CACHE_TTL_MS) {
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, existing);
      return existing;
    }
    const archive = await extractApkg(bytes);
    const collection = parseCollection(archive.collectionBuffer);
    const mediaMap = parseMediaManifest(archive.mediaManifestRaw);
    const parsed: ParsedApkg = {
      collection,
      mediaMap,
      mediaEntries: archive.mediaEntries,
      parsedAt: Date.now(),
    };
    this.cache.set(cacheKey, parsed);
    while (this.cache.size > MAX_CACHE_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (!oldestKey) break;
      this.cache.delete(oldestKey);
    }
    return parsed;
  }

  getMeta(parsed: ParsedApkg): PreviewMeta {
    const counts = new Map<number, number>();
    for (const card of parsed.collection.cards) {
      counts.set(card.did, (counts.get(card.did) ?? 0) + 1);
    }
    const decks: DeckMeta[] = Array.from(parsed.collection.decks.values())
      .filter((deck) => (counts.get(deck.id) ?? 0) > 0)
      .map((deck) => ({
        id: deck.id,
        fullName: deck.name,
        path: deck.name.split('::'),
        cardCount: counts.get(deck.id) ?? 0,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    return {
      totalCards: parsed.collection.cards.length,
      decks,
    };
  }

  getMediaEntry(
    parsed: ParsedApkg,
    originalName: string
  ): Buffer | null {
    const archiveName = parsed.mediaMap.get(originalName);
    if (!archiveName) return null;
    return parsed.mediaEntries.get(archiveName) ?? null;
  }

  getCardsPage(
    parsed: ParsedApkg,
    cursor: number,
    pageSize: number,
    mediaBaseUrl: string,
    deckId: number | null = null
  ): { cards: RenderedCard[]; nextCursor: number | null; total: number } {
    const all =
      deckId == null
        ? parsed.collection.cards
        : parsed.collection.cards.filter((card) => card.did === deckId);
    const end = Math.min(all.length, cursor + pageSize);
    const slice = all.slice(cursor, end);
    const cards: RenderedCard[] = [];
    for (const card of slice) {
      const rendered = this.renderCard(parsed, card.id, mediaBaseUrl);
      if (rendered) cards.push(rendered);
    }
    return {
      cards,
      nextCursor: end < all.length ? end : null,
      total: all.length,
    };
  }

  private renderCard(
    parsed: ParsedApkg,
    cardId: number,
    mediaBaseUrl: string
  ): RenderedCard | null {
    const card = parsed.collection.cards.find((c) => c.id === cardId);
    if (!card) {
      console.warn(`[apkg-preview] card ${cardId}: not found in collection`);
      return null;
    }
    const note = parsed.collection.notes.get(card.nid);
    if (!note) {
      console.warn(`[apkg-preview] card ${cardId}: note ${card.nid} not found`);
      return null;
    }
    const noteType = parsed.collection.noteTypes.get(note.mid);
    if (!noteType) {
      console.warn(`[apkg-preview] card ${cardId}: noteType ${note.mid} not found`);
      return null;
    }
    const templateOrd = noteType.type === 1 ? 0 : card.ord;
    const template = noteType.templates.find((t) => t.ord === templateOrd);
    if (!template) {
      console.warn(`[apkg-preview] card ${cardId}: template ord=${templateOrd} not found in noteType "${noteType.name}" (has ${noteType.templates.length} templates)`);
      return null;
    }
    const deck = parsed.collection.decks.get(card.did);

    const activeClozeNumber = noteType.type === 1 ? card.ord + 1 : null;
    const frontFields =
      activeClozeNumber != null
        ? applyClozeToFields(note.fields, activeClozeNumber, 'front')
        : note.fields;
    const backFields =
      activeClozeNumber != null
        ? applyClozeToFields(note.fields, activeClozeNumber, 'back')
        : note.fields;

    const baseSpecials: TemplateSpecials = {
      Tags: note.tags.trim(),
      Type: noteType.name,
      Deck: deck?.name ?? '',
      Subdeck: deck?.name.split('::').pop() ?? '',
      Card: template.name,
    };

    const frontRaw = renderTemplate(
      template.qfmt,
      buildFieldMap(frontFields, noteType),
      baseSpecials
    );
    const backRaw = renderTemplate(
      template.afmt,
      buildFieldMap(backFields, noteType),
      { ...baseSpecials, FrontSide: frontRaw }
    );

    const front = rewriteMediaRefs(
      sanitizeCardHtml(frontRaw),
      parsed.mediaMap,
      mediaBaseUrl
    );
    const back = rewriteMediaRefs(
      sanitizeCardHtml(backRaw),
      parsed.mediaMap,
      mediaBaseUrl
    );

    const deckPath = deck?.name ? deck.name.split('::') : [];

    return {
      id: card.id,
      ord: card.ord,
      templateName: template.name,
      deckName: deck?.name ?? '',
      deckPath,
      noteTypeName: noteType.name,
      css: sanitizeCss(noteType.css),
      front,
      back,
    };
  }
}
