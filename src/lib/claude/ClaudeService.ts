import type Anthropic from '@anthropic-ai/sdk';
import type { Message } from '@anthropic-ai/sdk/resources/messages';
import * as cheerio from 'cheerio';
import { createHash } from 'node:crypto';
import { jsonrepair } from 'jsonrepair';
import { splitOversizedCards } from './splitOversizedCards';

const SYSTEM_PROMPT = `
You are an Anki flashcard generator. Output ONLY a compact JSON array.

Format (nothing else — no markdown, no explanation):
[{"deck":"Deck Name","cards":[{"q":"front HTML","a":"back HTML"}]}]

Optional card fields (omit when not applicable):
- "tags": string[]    — topic tags
- "cloze": true       — only when front contains {{c1::...}} syntax
- "media": string[]   — only local filenames that appear in the Available media files list

Extraction rules:
- HTML <details>/<summary>: <summary> text = q, sibling content = a
- Heading followed by paragraph: heading = q, paragraph = a
- Bold term + definition: term = q, definition = a
- Inline <code> in q: rewrite as {{c1::code}} and set "cloze": true
- Preserve HTML formatting in q and a
- Never invent content — only use text present in the document

Minimum-information rules (one fact per card):
- Each card must hold one fact, definition, or concept — never multiple facts bundled together
- Split a paragraph that states multiple facts into one card per fact
- A table of N rows produces N cards (one row per card)
- One definition with its example may stay on a single card
- Cloze cards are already single-fact — do not split them
- If the user's additional instructions explicitly ask for detailed or longer cards, defer to those instructions over these rules
`.trim();

export const EMPTY_CONTENT_USER_MESSAGE =
  "Claude couldn't find any content to turn into flashcards in this Notion page. The page looks empty or only contains layout elements like buttons or placeholders. Try adding headings with explanations, toggle lists, or question-and-answer text, then convert again.";

const EMPTY_CONTENT_SIGNALS = [
  'no actual',
  'no extractable',
  'no flashcard',
  'no question',
  'nothing to convert',
  "couldn't find",
  'cannot find',
  'unable to find',
  'no q&a',
  'no q/a',
  'consists only of',
];

export function looksLikeEmptyContentExplanation(cleaned: string): boolean {
  const lower = cleaned.toLowerCase();
  return EMPTY_CONTENT_SIGNALS.some((signal) => lower.includes(signal));
}

function causeMessage(err: unknown): string | undefined {
  if (err instanceof Error) return err.message;
  return undefined;
}

function causeCode(err: unknown): string | undefined {
  if (err instanceof Error && 'code' in err) return String((err as NodeJS.ErrnoException).code);
  return undefined;
}

function deterministicId(input: string): number {
  const hex = createHash('sha1').update(input).digest('hex').slice(0, 13);
  return Number.parseInt(hex, 16) % 1e13;
}

function extractStyleFromHtml(html: string): string {
  const $ = cheerio.load(html);
  const raw = $('style')
    .map((_, el) => $(el).html() ?? '')
    .get()
    .join('\n');
  return raw
    .replaceAll('white-space: pre-wrap;', '')
    .replaceAll('list-style-type: none;', '');
}

function stripHtmlBoilerplate(html: string): string {
  const $ = cheerio.load(html);
  $('style, script, head, link[rel="stylesheet"]').remove();
  const body = $('body');
  return body.length ? body.html() ?? '' : $.html();
}

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

export interface DeckInfo {
  name: string;
  image: string;
  style: null | string;
  id: number;
  settings: Record<string, unknown>;
  cards: CardInfo[];
}

export interface CardInfo {
  name: string;
  back: string;
  tags: string[];
  cloze: boolean;
  number: number;
  enableInput: boolean;
  answer: string;
  media: string[];
}

export function normalizeTag(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 32);
}

function resolveMediaPath(claudePath: string, availableMediaFiles: string[]): string {
  const normalized = claudePath.replaceAll('\\', '/');
  if (availableMediaFiles.includes(normalized)) return normalized;
  const filename = normalized.split('/').pop() ?? normalized;
  const match = availableMediaFiles.find((f) => f.replaceAll('\\', '/').endsWith('/' + filename));
  return match ?? normalized;
}

function stripPathsFromCardHtml(html: string): string {
  const $ = cheerio.load(html);
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src') ?? '';
    if (!src.startsWith('http://') && !src.startsWith('https://')) {
      const filename = decodeURIComponent(src).split('/').pop() ?? src;
      $(el).attr('src', filename);
    }
  });
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (!href.startsWith('http://') && !href.startsWith('https://')) {
      const filename = decodeURIComponent(href).split('/').pop() ?? href;
      $(el).attr('href', filename);
    }
  });
  const body = $('body');
  return body.length ? body.html() ?? html : html;
}

const AUDIO_EXTENSIONS = /\.(mp3|ogg|oga|opus|wav|flac|m4a|aac)$/i;

function isLocalAudioHref(href: string): boolean {
  if (!href) return false;
  if (href.startsWith('http://') || href.startsWith('https://')) return false;
  return AUDIO_EXTENSIONS.test(href);
}

interface AudioRewriteResult {
  back: string;
  audioFilenames: string[];
}

export function rewriteAudioAnchors(back: string): AudioRewriteResult {
  const $ = cheerio.load(back);
  const audioFilenames: string[] = [];
  let mutated = false;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (!isLocalAudioHref(href)) return;
    const filename = decodeURIComponent(href).split('/').pop() ?? href;
    if (!audioFilenames.includes(filename)) audioFilenames.push(filename);
    const figure = $(el).closest('figure');
    if (figure.length) {
      figure.remove();
    } else {
      $(el).remove();
    }
    mutated = true;
  });
  if (!mutated) return { back, audioFilenames };
  const body = $('body');
  const stripped = body.length ? body.html() ?? back : back;
  const tokens = audioFilenames.map((name) => `[sound:${name}]`).join('');
  return { back: stripped + tokens, audioFilenames };
}

function expandCompactDeckInfo(compact: CompactDeck[], availableMediaFiles: string[], style: string | null): DeckInfo[] {
  return compact.map((d) => ({
    name: d.deck,
    image: '',
    style,
    id: deterministicId(d.deck),
    settings: {
      template: 'specialstyle',
      clozeModelName: 'n2a-cloze',
      basicModelName: 'n2a-basic',
      inputModelName: 'n2a-input',
      useNotionId: true,
    },
    cards: d.cards.map((c) => {
      const { back: rewrittenBack, audioFilenames } = rewriteAudioAnchors(
        stripPathsFromCardHtml(c.a)
      );
      const declaredMedia = (c.media ?? []).map((m) =>
        resolveMediaPath(m, availableMediaFiles)
      );
      const audioMedia = audioFilenames.map((name) =>
        resolveMediaPath(name, availableMediaFiles)
      );
      const media = Array.from(new Set([...declaredMedia, ...audioMedia]));
      return {
        name: stripPathsFromCardHtml(c.q),
        back: rewrittenBack,
        tags: (c.tags ?? []).map(normalizeTag).filter((t) => t.length > 0),
        cloze: c.cloze ?? false,
        number: 0,
        enableInput: false,
        answer: '',
        notionId: deterministicId(c.q),
        media,
      };
    }),
  }));
}

let _anthropicClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AnthropicClass = require('@anthropic-ai/sdk').default;
    _anthropicClient = new AnthropicClass({
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultHeaders: { 'anthropic-beta': 'prompt-caching-2024-07-31' },
    }) as Anthropic;
    console.log('[Claude] Client initialised', { apiKeySet: !!process.env.ANTHROPIC_API_KEY });
  }
  return _anthropicClient as Anthropic;
}

const CHUNK_SIZE = 40_000;

function chunkHtmlByDetails(html: string): string[] {
  if (html.length <= CHUNK_SIZE) return [html];

  const chunks: string[] = [];
  let offset = 0;

  while (offset < html.length) {
    if (offset + CHUNK_SIZE >= html.length) {
      chunks.push(html.slice(offset));
      break;
    }

    let splitAt = html.lastIndexOf('</details>', offset + CHUNK_SIZE);
    if (splitAt <= offset) {
      splitAt = offset + CHUNK_SIZE;
    } else {
      splitAt += '</details>'.length;
    }

    chunks.push(html.slice(offset, splitAt));
    offset = splitAt;
  }

  return chunks;
}

function mergeDeckInfoArrays(decks: DeckInfo[]): DeckInfo[] {
  const byName = new Map<string, DeckInfo>();
  for (const deck of decks) {
    const existing = byName.get(deck.name);
    if (existing) {
      existing.cards.push(...deck.cards);
    } else {
      byName.set(deck.name, { ...deck, cards: [...deck.cards] });
    }
  }
  return Array.from(byName.values());
}

function buildUserMessage(
  strippedContent: string,
  availableMediaFiles: string[],
  userInstructions: string | undefined
): string {
  const mediaFilesList =
    availableMediaFiles.length > 0
      ? `\n\nAvailable local media files:\n${availableMediaFiles.map((f) => `- ${f}`).join('\n')}`
      : '';

  const instructionsSection = userInstructions?.trim()
    ? `\n\nAdditional instructions:\n${userInstructions.trim()}`
    : '';

  return `Convert this HTML content into the compact deck JSON:\n\n${strippedContent}${mediaFilesList}${instructionsSection}`;
}

function tryRepairDeckArray(toParse: string): unknown[] | null {
  let candidate: unknown;
  try {
    candidate = JSON.parse(jsonrepair(toParse));
  } catch {
    return null;
  }
  if (!Array.isArray(candidate) || candidate.length === 0) return null;
  const hasUsableCard = candidate.some((deck) => {
    if (!deck || typeof deck !== 'object') return false;
    const cards = (deck as { cards?: unknown }).cards;
    if (!Array.isArray(cards)) return false;
    return cards.some((card) => {
      if (!card || typeof card !== 'object') return false;
      const q = (card as { q?: unknown }).q;
      const a = (card as { a?: unknown }).a;
      return typeof q === 'string' && q.length > 0 && typeof a === 'string' && a.length > 0;
    });
  });
  return hasUsableCard ? candidate : null;
}

export function parseDeckResponse(
  cleaned: string,
  raw: string,
  chunkIndex: number
): CompactDeck[] {
  // Claude sometimes appends explanation prose after the closing fence/bracket.
  // Truncate at the last ']' so trailing text doesn't break JSON.parse.
  const jsonEnd = cleaned.lastIndexOf(']');
  const toParse = jsonEnd >= 0 ? cleaned.slice(0, jsonEnd + 1) : cleaned;

  let parsed: unknown;
  try {
    parsed = JSON.parse(toParse);
  } catch {
    // Repairs Claude's occasional unescaped " in string values (common with German „…" and other non-English quoting); plausibility check guards against over-eager repair on truncated content.
    const repaired = tryRepairDeckArray(toParse);
    if (repaired) {
      parsed = repaired;
      console.warn('[Claude] Recovered malformed JSON via jsonrepair', { chunkIndex });
    } else {
      console.error('[Claude] Failed to parse response as JSON', {
        raw,
        cleaned,
        toParse,
        chunkIndex,
      });
      if (looksLikeEmptyContentExplanation(cleaned)) {
        throw new Error(EMPTY_CONTENT_USER_MESSAGE);
      }
      throw new Error(`Claude returned invalid JSON:\n${raw}`);
    }
  }

  if (!Array.isArray(parsed)) {
    console.error('[Claude] Response is not an array', { raw, cleaned, chunkIndex });
    throw new Error('Claude returned unexpected JSON structure (not an array)');
  }

  return parsed as CompactDeck[];
}

async function generateDeckInfoFromChunk(
  strippedContent: string,
  pageStyle: string,
  availableMediaFiles: string[],
  userInstructions: string | undefined,
  chunkIndex: number,
  totalChunks: number,
  onProgress?: (step: string) => void
): Promise<DeckInfo[]> {
  const tChunk0 = Date.now();
  const client = getAnthropicClient();

  const userMessage = buildUserMessage(strippedContent, availableMediaFiles, userInstructions);
  const maxTokens = strippedContent.length > 20000 ? 16384 : 4096;

  onProgress?.(`claude:chunk:${chunkIndex + 1}:${totalChunks}`);

  console.log('[Claude] Sending request to Claude API', {
    model: 'claude-sonnet-4-5',
    promptBytes: userMessage.length,
    maxTokens,
    mediaFilesCount: availableMediaFiles.length,
    hasUserInstructions: !!userInstructions?.trim(),
    chunkIndex,
    totalChunks,
  });

  const tApi0 = Date.now();
  let response: Message;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = (client.messages as any).stream({
      model: 'claude-sonnet-4-5',
      max_tokens: maxTokens,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userMessage }],
    });

    let lastPulseMs = Date.now();
    stream.on('text', () => {
      const now = Date.now();
      if (now - lastPulseMs >= 5000) {
        onProgress?.(`claude:chunk:${chunkIndex + 1}:${totalChunks}`);
        lastPulseMs = now;
      }
    });

    response = await stream.finalMessage() as Message;
  } catch (err) {
    const elapsedMs = Date.now() - tApi0;
    const error = err instanceof Error ? err : new Error(String(err));
    const cause = 'cause' in error ? error.cause : undefined;
    const rootCause = cause instanceof Error && 'cause' in cause ? cause.cause : undefined;
    console.error('[Claude] API request failed', {
      elapsedMs,
      chunkIndex,
      totalChunks,
      error: error.message,
      cause: causeMessage(cause),
      causeCode: causeCode(cause),
      rootCause: causeMessage(rootCause),
      rootCauseCode: causeCode(rootCause),
    });
    throw error;
  }
  const apiMs = Date.now() - tApi0;

  console.log('[Claude] Received response', {
    stopReason: response.stop_reason,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
    cacheCreationTokens: response.usage?.cache_creation_input_tokens,
    cacheReadTokens: response.usage?.cache_read_input_tokens,
    apiDurationMs: apiMs,
    tokensPerSecond: response.usage?.output_tokens
      ? Math.round((response.usage.output_tokens / apiMs) * 1000)
      : null,
    chunkIndex,
    totalChunks,
  });

  const raw = (response.content as Array<{ type: string; text?: string }>)
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('');

  const cleaned = raw.replace(/```json|```/g, '').trim();

  const tParse0 = Date.now();
  const parsed = parseDeckResponse(cleaned, raw, chunkIndex);

  const inputCardCount = parsed.reduce((sum, d) => sum + d.cards.length, 0);
  const avgAnswerLenBefore =
    inputCardCount > 0
      ? Math.round(
          parsed.reduce(
            (sum, d) => sum + d.cards.reduce((s, c) => s + c.a.replace(/<[^>]*>/g, '').length, 0),
            0
          ) / inputCardCount
        )
      : 0;

  const split = splitOversizedCards(parsed);

  const outputCardCount = split.reduce((sum, d) => sum + d.cards.length, 0);
  const avgAnswerLenAfter =
    outputCardCount > 0
      ? Math.round(
          split.reduce(
            (sum, d) => sum + d.cards.reduce((s, c) => s + c.a.replace(/<[^>]*>/g, '').length, 0),
            0
          ) / outputCardCount
        )
      : 0;

  console.log('[Claude] splitOversizedCards', {
    inputCardCount,
    outputCardCount,
    avgAnswerLenBefore,
    avgAnswerLenAfter,
    chunkIndex,
  });

  const deckInfo = expandCompactDeckInfo(split, availableMediaFiles, pageStyle || null);
  const parseMs = Date.now() - tParse0;
  console.log('[Claude] chunk done', {
    chunkIndex,
    totalChunks,
    decksCount: deckInfo.length,
    totalCards: deckInfo.reduce((sum, deck) => sum + deck.cards.length, 0),
    apiMs,
    parseMs,
    chunkTotalMs: Date.now() - tChunk0,
  });
  return deckInfo;
}

export async function generateDeckInfo(
  htmlContent: string,
  availableMediaFiles: string[],
  userInstructions?: string,
  onProgress?: (step: string) => void
): Promise<DeckInfo[]> {
  const t0 = Date.now();

  const tStrip0 = Date.now();
  const pageStyle = extractStyleFromHtml(htmlContent);
  const strippedContent = stripHtmlBoilerplate(htmlContent);
  console.log('[Claude] stripHtmlBoilerplate', {
    originalBytes: htmlContent.length,
    strippedBytes: strippedContent.length,
    savedBytes: htmlContent.length - strippedContent.length,
    savedPct: htmlContent.length > 0
      ? (((htmlContent.length - strippedContent.length) / htmlContent.length) * 100).toFixed(1) + '%'
      : 'N/A',
    durationMs: Date.now() - tStrip0,
  });

  const chunks = chunkHtmlByDetails(strippedContent);
  console.log('[Claude] Chunked HTML', { chunks: chunks.length, strippedBytes: strippedContent.length });

  const chunkResults = await Promise.all(
    chunks.map((chunk, i) =>
      generateDeckInfoFromChunk(chunk, pageStyle, availableMediaFiles, userInstructions, i, chunks.length, onProgress)
    )
  );

  const deckInfo = mergeDeckInfoArrays(chunkResults.flat());
  console.log('[Claude] All chunks done', {
    totalDecks: deckInfo.length,
    totalCards: deckInfo.reduce((sum, d) => sum + d.cards.length, 0),
    totalMs: Date.now() - t0,
  });

  return deckInfo;
}

