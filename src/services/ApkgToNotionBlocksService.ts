import {
  NormalizedCollection,
  Note,
  NoteType,
} from './ApkgPreviewService/types';

const CLOZE_REGEX = /\{\{c\d+::([^}]*?)(?:::[^}]*)?\}\}/g;
const SOUND_TAG_REGEX = /\[sound:([^\]]+)\]/g;
const IMG_SRC_REGEX = /<img\s[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi;
const BOLD_REGEX = /<b>(.*?)<\/b>/gi;
const ITALIC_REGEX = /<i>(.*?)<\/i>/gi;
const STRONG_REGEX = /<strong>(.*?)<\/strong>/gi;
const EM_REGEX = /<em>(.*?)<\/em>/gi;
const ALL_HTML_TAGS_REGEX = /<[^>]*>/g;
const BR_REGEX = /<br\s*\/?>/gi;

const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'bmp',
]);

interface RichTextSegment {
  type: 'text';
  plain_text: string;
  text: { content: string };
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: 'default';
  };
}

interface ParagraphBlock {
  type: 'paragraph';
  paragraph: {
    rich_text: RichTextSegment[];
  };
}

interface ExternalImageBlock {
  type: 'image';
  image: {
    type: 'external';
    external: { url: string };
  };
}

interface FileUploadImageBlock {
  type: 'image';
  image: {
    type: 'file_upload';
    file_upload: { id: string };
  };
}

type ImageBlock = ExternalImageBlock | FileUploadImageBlock;

interface DividerBlock {
  type: 'divider';
  divider: Record<string, never>;
}

type ToggleChildBlock = ParagraphBlock | ImageBlock;

interface ToggleHeading3Block {
  type: 'heading_3';
  heading_3: {
    rich_text: RichTextSegment[];
    is_toggleable: true;
    children: ToggleChildBlock[];
  };
}

type NoteBlock =
  | ToggleHeading3Block
  | ImageBlock
  | DividerBlock
  | ParagraphBlock;

export interface DeckPage {
  title: string;
  children: NoteBlock[];
  subDecks: DeckPage[];
}

export interface TransformResult {
  deckPages: DeckPage[];
  totalNotes: number;
  importedNotes: number;
  truncated: boolean;
}

export interface TruncationNoticeInput {
  importedNotes: number;
  totalNotes: number;
  isPaying: boolean;
  paidCap: number;
}

const HTML_ENTITY_REGEX = /&(#(\d+)|#x([0-9a-fA-F]+)|(\w+));/g;
const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
  copy: '©',
  reg: '®',
  trade: '™',
  times: '×',
  divide: '÷',
};

function decodeHtmlEntities(text: string): string {
  return text.replace(HTML_ENTITY_REGEX, (_, _full, decimal, hex, named) => {
    if (decimal) return String.fromCodePoint(parseInt(decimal, 10));
    if (hex) return String.fromCodePoint(parseInt(hex, 16));
    if (named) return NAMED_ENTITIES[named] ?? `&${named};`;
    return _;
  });
}

function decodeMediaFilename(name: string): string {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function extractImageFilenames(html: string): string[] {
  const filenames: string[] = [];
  let match: RegExpExecArray | null;
  const regex = /<img[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  while ((match = regex.exec(html)) !== null) {
    filenames.push(decodeMediaFilename(match[1]));
  }
  return filenames;
}

function extractSoundFilenames(html: string): string[] {
  const filenames: string[] = [];
  let match: RegExpExecArray | null;
  const regex = /\[sound:([^\]]+)\]/g;
  while ((match = regex.exec(html)) !== null) {
    filenames.push(decodeMediaFilename(match[1]));
  }
  return filenames;
}

function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(ext);
}

function stripMediaRefs(html: string): string {
  let result = html.replace(IMG_SRC_REGEX, '');
  result = result.replace(SOUND_TAG_REGEX, '');
  return result;
}

function stripClozeMarkers(text: string): string {
  return text.replace(CLOZE_REGEX, '$1');
}

function getPlainText(html: string): string {
  return stripMediaRefs(html).replace(ALL_HTML_TAGS_REGEX, '').trim();
}

const NOTION_RICH_TEXT_LIMIT = 2000;
const NOTION_RICH_TEXT_ARRAY_LIMIT = 100;

function makeRichTextSegment(
  content: string,
  bold = false,
  italic = false
): RichTextSegment {
  return {
    type: 'text',
    plain_text: content,
    text: { content },
    annotations: {
      bold,
      italic,
      strikethrough: false,
      underline: false,
      code: false,
      color: 'default',
    },
  };
}

function makeRichText(
  content: string,
  bold = false,
  italic = false
): RichTextSegment[] {
  const decoded = decodeHtmlEntities(content);
  if (decoded.length <= NOTION_RICH_TEXT_LIMIT) {
    return [makeRichTextSegment(decoded, bold, italic)];
  }
  const segments: RichTextSegment[] = [];
  for (let i = 0; i < decoded.length; i += NOTION_RICH_TEXT_LIMIT) {
    segments.push(
      makeRichTextSegment(
        decoded.slice(i, i + NOTION_RICH_TEXT_LIMIT),
        bold,
        italic
      )
    );
  }
  return segments;
}

function makeImageBlock(ref: string): ImageBlock {
  if (ref.startsWith('http://') || ref.startsWith('https://')) {
    return {
      type: 'image',
      image: {
        type: 'external',
        external: { url: ref },
      },
    };
  }
  return {
    type: 'image',
    image: {
      type: 'file_upload',
      file_upload: { id: ref },
    },
  };
}

function parseHtmlToRichText(html: string): RichTextSegment[] {
  const cleaned = stripMediaRefs(html);
  const withNewlines = cleaned.replace(BR_REGEX, '\n');

  const segments: RichTextSegment[] = [];

  const tagPattern = /<(b|strong|i|em)>([^<]*)<\/\1>/gi;
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  const allMatches: Array<{
    index: number;
    end: number;
    text: string;
    bold: boolean;
    italic: boolean;
  }> = [];

  while ((match = tagPattern.exec(withNewlines)) !== null) {
    const tag = match[1].toLowerCase();
    const innerText = match[2].replace(ALL_HTML_TAGS_REGEX, '');
    const isBold = tag === 'b' || tag === 'strong';
    const isItalic = tag === 'i' || tag === 'em';
    allMatches.push({
      index: match.index,
      end: match.index + match[0].length,
      text: innerText,
      bold: isBold,
      italic: isItalic,
    });
  }

  if (allMatches.length === 0) {
    const plain = withNewlines.replace(ALL_HTML_TAGS_REGEX, '').trim();
    if (plain.length > 0) {
      segments.push(...makeRichText(plain));
    }
    return segments;
  }

  for (const m of allMatches) {
    const before = withNewlines
      .slice(lastIndex, m.index)
      .replace(ALL_HTML_TAGS_REGEX, '');
    if (before.length > 0) {
      segments.push(...makeRichText(before));
    }
    if (m.text.length > 0) {
      segments.push(...makeRichText(m.text, m.bold, m.italic));
    }
    lastIndex = m.end;
  }

  const after = withNewlines.slice(lastIndex).replace(ALL_HTML_TAGS_REGEX, '');
  if (after.length > 0) {
    segments.push(...makeRichText(after));
  }

  return segments.slice(0, NOTION_RICH_TEXT_ARRAY_LIMIT);
}

function makeParagraph(richText: RichTextSegment[]): ParagraphBlock {
  return {
    type: 'paragraph',
    paragraph: { rich_text: richText },
  };
}

function fieldToBlocks(
  html: string,
  mediaUrlMap: Map<string, string>
): ToggleChildBlock[] {
  const blocks: ToggleChildBlock[] = [];

  const imageFiles = extractImageFilenames(html);
  for (const filename of imageFiles) {
    const url = mediaUrlMap.get(filename);
    if (url && isImageFile(filename)) {
      blocks.push(makeImageBlock(url));
    }
  }

  const soundFiles = extractSoundFilenames(html);
  for (const filename of soundFiles) {
    const url = mediaUrlMap.get(filename);
    if (url) {
      blocks.push(
        makeParagraph(makeRichText(`Audio: ${filename}`, false, true))
      );
    }
  }

  const segments = parseHtmlToRichText(html);
  if (segments.length > 0) {
    blocks.push(makeParagraph(segments));
  }

  return blocks;
}

function findSummaryText(note: Note, isCloze: boolean): string {
  for (const field of note.fields) {
    let text = stripMediaRefs(field);
    if (isCloze) {
      text = stripClozeMarkers(text);
    }
    const plain = text.replace(ALL_HTML_TAGS_REGEX, '').trim();
    if (plain.length > 0) {
      return plain;
    }
  }
  return 'Untitled';
}

const IMAGE_FIRST_TEXT_THRESHOLD = 20;

function isImageFirstNote(note: Note, noteType: NoteType): boolean {
  if (noteType.type === 1) return false;
  const front = note.fields[0] ?? '';
  const hasImage = extractImageFilenames(front).length > 0;
  if (!hasImage) return false;
  const textOnly = stripMediaRefs(front)
    .replace(ALL_HTML_TAGS_REGEX, '')
    .trim();
  return textOnly.length <= IMAGE_FIRST_TEXT_THRESHOLD;
}

function makeDivider(): DividerBlock {
  return { type: 'divider', divider: {} };
}

function noteToImageLayout(
  note: Note,
  noteType: NoteType,
  mediaUrlMap: Map<string, string>
): NoteBlock[] {
  const blocks: NoteBlock[] = [makeDivider()];

  const frontImages = extractImageFilenames(note.fields[0] ?? '');
  for (const filename of frontImages) {
    const url = mediaUrlMap.get(filename);
    if (url && isImageFile(filename)) {
      blocks.push(makeImageBlock(url));
    }
  }

  const backFields = note.fields.slice(1);
  const answerChildren: ToggleChildBlock[] = [];

  for (const field of backFields) {
    const fieldBlocks = fieldToBlocks(field, mediaUrlMap);
    answerChildren.push(...fieldBlocks);
  }

  if (answerChildren.length === 0) {
    answerChildren.push(makeParagraph(makeRichText(' ')));
  }

  const tags = note.tags.trim();
  if (tags.length > 0) {
    const tagText = tags
      .split(/\s+/)
      .filter((t) => t.length > 0)
      .map((t) => `#${t}`)
      .join(' ');
    answerChildren.push(makeParagraph(makeRichText(tagText, false, true)));
  }

  const firstBackFieldName =
    noteType.fields.length > 1 ? noteType.fields[1].name : null;
  const toggleLabel =
    firstBackFieldName &&
    backFields.length === 1 &&
    firstBackFieldName !== 'Back'
      ? firstBackFieldName
      : 'Answer';

  blocks.push({
    type: 'heading_3',
    heading_3: {
      rich_text: makeRichText(toggleLabel),
      is_toggleable: true,
      children: answerChildren,
    },
  });

  return blocks;
}

function noteToToggle(
  note: Note,
  noteType: NoteType,
  mediaUrlMap: Map<string, string>
): ToggleHeading3Block {
  const isCloze = noteType.type === 1;
  const summaryText = findSummaryText(note, isCloze);
  const summaryRichText = makeRichText(summaryText);

  const children: ToggleChildBlock[] = [];

  const frontImages = extractImageFilenames(note.fields[0] ?? '');
  for (const filename of frontImages) {
    const url = mediaUrlMap.get(filename);
    if (url && isImageFile(filename)) {
      children.push(makeImageBlock(url));
    }
  }

  const backFields = note.fields.slice(1);

  for (const field of backFields) {
    if (isCloze) {
      const clozeText = stripMediaRefs(note.fields[0] ?? '');
      const segments = parseClozeToRichText(clozeText);
      if (segments.length > 0) {
        children.push(makeParagraph(segments));
      }
    } else {
      const fieldBlocks = fieldToBlocks(field, mediaUrlMap);
      children.push(...fieldBlocks);
    }
  }

  if (children.length === 0 && backFields.length === 0) {
    if (isCloze) {
      const clozeText = stripMediaRefs(note.fields[0] ?? '');
      const segments = parseClozeToRichText(clozeText);
      if (segments.length > 0) {
        children.push(makeParagraph(segments));
      }
    }
  }

  if (children.length === 0) {
    children.push(makeParagraph(makeRichText(' ')));
  }

  const tags = note.tags.trim();
  if (tags.length > 0) {
    const tagText = tags
      .split(/\s+/)
      .filter((t) => t.length > 0)
      .map((t) => `#${t}`)
      .join(' ');
    children.push(makeParagraph(makeRichText(tagText, false, true)));
  }

  return {
    type: 'heading_3',
    heading_3: {
      rich_text: summaryRichText,
      is_toggleable: true,
      children,
    },
  };
}

function parseClozeToRichText(html: string): RichTextSegment[] {
  const cleaned = html.replace(ALL_HTML_TAGS_REGEX, '');
  const segments: RichTextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = /\{\{c\d+::([^}]*?)(?:::[^}]*)?\}\}/g;

  while ((match = regex.exec(cleaned)) !== null) {
    const before = cleaned.slice(lastIndex, match.index);
    if (before.length > 0) {
      segments.push(...makeRichText(before));
    }
    segments.push(...makeRichText(match[1], true, false));
    lastIndex = match.index + match[0].length;
  }

  const after = cleaned.slice(lastIndex);
  if (after.length > 0) {
    segments.push(...makeRichText(after));
  }

  return segments.slice(0, NOTION_RICH_TEXT_ARRAY_LIMIT);
}

interface DeckNode {
  name: string;
  fullName: string;
  id: number;
  children: Map<string, DeckNode>;
  notes: Array<{ note: Note; noteType: NoteType }>;
}

function buildDeckTree(
  collection: NormalizedCollection
): Map<string, DeckNode> {
  const deckNodes = new Map<string, DeckNode>();

  for (const [, deck] of collection.decks) {
    const parts = deck.name.split('::');
    let currentMap = deckNodes;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}::${part}` : part;

      if (!currentMap.has(part)) {
        currentMap.set(part, {
          name: part,
          fullName: currentPath,
          id: i === parts.length - 1 ? deck.id : -1,
          children: new Map(),
          notes: [],
        });
      }
      const node = currentMap.get(part)!;
      if (i === parts.length - 1) {
        node.id = deck.id;
      }
      currentMap = node.children;
    }
  }

  const notesByDeckId = new Map<
    number,
    Array<{ note: Note; noteType: NoteType }>
  >();
  const seenNotes = new Set<number>();

  for (const card of collection.cards) {
    if (seenNotes.has(card.nid)) continue;
    seenNotes.add(card.nid);

    const note = collection.notes.get(card.nid);
    if (note == null) continue;
    const noteType = collection.noteTypes.get(note.mid);
    if (noteType == null) continue;

    const existing = notesByDeckId.get(card.did) ?? [];
    existing.push({ note, noteType });
    notesByDeckId.set(card.did, existing);
  }

  function assignNotes(nodes: Map<string, DeckNode>) {
    for (const [, node] of nodes) {
      const notesForDeck = notesByDeckId.get(node.id);
      if (notesForDeck) {
        node.notes = notesForDeck;
      }
      assignNotes(node.children);
    }
  }

  assignNotes(deckNodes);
  return deckNodes;
}

function hasNotes(node: DeckNode): boolean {
  if (node.notes.length > 0) return true;
  for (const [, child] of node.children) {
    if (hasNotes(child)) return true;
  }
  return false;
}

function deckNodeToDeckPage(
  node: DeckNode,
  mediaUrlMap: Map<string, string>
): DeckPage {
  const children: NoteBlock[] = [];
  for (const { note, noteType } of node.notes) {
    if (isImageFirstNote(note, noteType)) {
      children.push(...noteToImageLayout(note, noteType, mediaUrlMap));
    } else {
      children.push(noteToToggle(note, noteType, mediaUrlMap));
    }
  }

  const subDecks: DeckPage[] = [];
  for (const [, child] of node.children) {
    if (hasNotes(child)) {
      subDecks.push(deckNodeToDeckPage(child, mediaUrlMap));
    }
  }

  return {
    title: node.name,
    children,
    subDecks,
  };
}

function formatNoteCount(count: number): string {
  if (count < 10000) {
    return String(count);
  }
  return count.toLocaleString('en-US').replaceAll(',', ' ');
}

export function buildTruncationNoticeBlocks(
  input: TruncationNoticeInput
): NoteBlock[] {
  const imported = formatNoteCount(input.importedNotes);
  const total = formatNoteCount(input.totalNotes);
  const paidCap = formatNoteCount(input.paidCap);
  const headline = makeRichText(
    `Imported the first ${imported} of ${total} notes.`,
    true
  );

  if (input.isPaying) {
    const remaining = formatNoteCount(input.totalNotes - input.importedNotes);
    return [
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [
            ...headline,
            ...makeRichText(
              ` The remaining ${remaining} notes were not imported — your plan imports up to ${imported} notes at a time.`
            ),
          ],
        },
      },
      {
        type: 'paragraph',
        paragraph: {
          rich_text: makeRichText(
            'Need a higher limit? Email support@2anki.net and we will raise it for you.'
          ),
        },
      },
      { type: 'divider', divider: {} },
    ];
  }

  return [
    {
      type: 'paragraph',
      paragraph: {
        rich_text: [
          ...headline,
          ...makeRichText(
            ` The free plan stops at ${imported} notes per import.`
          ),
        ],
      },
    },
    {
      type: 'paragraph',
      paragraph: {
        rich_text: makeRichText(
          `Paid plans import up to ${paidCap} notes. Upgrade at 2anki.net/pricing`
        ),
      },
    },
    { type: 'divider', divider: {} },
  ];
}

export default class ApkgToNotionBlocksService {
  transform(
    collection: NormalizedCollection,
    mediaUrlMap: Map<string, string>,
    maxNotes: number
  ): TransformResult {
    const seenNotes = new Set<number>();
    for (const card of collection.cards) {
      seenNotes.add(card.nid);
    }
    const totalNotes = seenNotes.size;
    const truncated = totalNotes > maxNotes;

    let workingCollection = collection;
    if (truncated) {
      const keptNids = new Set<number>();
      for (const card of collection.cards) {
        if (keptNids.has(card.nid)) continue;
        if (keptNids.size === maxNotes) continue;
        keptNids.add(card.nid);
      }
      workingCollection = {
        ...collection,
        cards: collection.cards.filter((card) => keptNids.has(card.nid)),
      };
    }

    const tree = buildDeckTree(workingCollection);
    const deckPages: DeckPage[] = [];

    for (const [, node] of tree) {
      if (hasNotes(node)) {
        deckPages.push(deckNodeToDeckPage(node, mediaUrlMap));
      }
    }

    return {
      deckPages,
      totalNotes,
      importedNotes: Math.min(totalNotes, maxNotes),
      truncated,
    };
  }
}
