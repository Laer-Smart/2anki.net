import * as cheerio from 'cheerio';

interface CompactCard {
  q: string;
  a: string;
  tags?: string[];
  cloze?: boolean;
  media?: string[];
}

interface CompactDeck {
  deck: string;
  cards: CompactCard[];
}

const ANSWER_CEILING = 600;
const SPLIT_CLAMP = 3;
const SENTENCE_BOUNDARY = /(?<=[.!?])\s+/;

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function splitOnSentenceBoundaries(text: string): string[] {
  return text.split(SENTENCE_BOUNDARY).filter((s) => s.trim().length > 0);
}

function groupSentencesUnderCeiling(sentences: string[]): string[] {
  const groups: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (stripHtmlTags(candidate).length <= ANSWER_CEILING) {
      current = candidate;
    } else {
      if (current) groups.push(current);
      current = sentence;
    }
  }

  if (current) groups.push(current);
  return groups;
}

function balanceHtmlTags(html: string): string {
  const $ = cheerio.load(html, { xmlMode: false });
  const body = $('body');
  return body.length ? (body.html() ?? html) : html;
}

function splitCard(card: CompactCard): CompactCard[] {
  if (card.cloze) {
    return [card];
  }

  const plain = stripHtmlTags(card.a ?? '');
  if (plain.length <= ANSWER_CEILING) {
    return [card];
  }

  const sentences = splitOnSentenceBoundaries(plain);
  if (sentences.length <= 1) {
    return [card];
  }

  const groups = groupSentencesUnderCeiling(sentences);
  if (groups.length <= 1) {
    return [card];
  }

  const clamped = groups.slice(0, SPLIT_CLAMP);

  return clamped.map((group) => ({
    q: card.q,
    a: balanceHtmlTags(group),
    ...(card.tags !== undefined ? { tags: card.tags } : {}),
    ...(card.media !== undefined ? { media: card.media } : {}),
  }));
}

export function splitOversizedCards(decks: CompactDeck[]): CompactDeck[] {
  return decks.map((deck) => ({
    ...deck,
    cards: deck.cards.flatMap(splitCard),
  }));
}
