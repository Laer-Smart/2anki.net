import Deck from '../../lib/parser/Deck';
import Note from '../../lib/parser/Note';
import CardOption from '../../lib/parser/Settings';
import Workspace from '../../lib/parser/WorkSpace';
import CustomExporter from '../../lib/parser/exporters/CustomExporter';
import {
  parseApkgNotes,
  ParseApkgNotesResult,
} from '../../services/ApkgPreviewService/parseApkgNotes';
import { transformApkgNotes, TransformMediaFile } from '../../services/ankify/transformService';
import { transformApkgWithImages } from '../../services/ankify/imageTransformService';
import {
  FieldSelection,
  ImageSource,
  TargetLanguage,
  TransformedNote,
  TransformName,
} from '../../lib/ankify/transforms/types';

export const UNKNOWN_MODEL_ERROR =
  "This deck uses a note type we don't support yet. v1 supports Basic and Cloze decks.";

export const EMPTY_DECK_ERROR =
  "We couldn't find any Basic or Cloze notes in this deck.";

export class DeckTooLargeError extends Error {
  constructor(
    public readonly noteCount: number,
    public readonly noteCap: number
  ) {
    super('deck_too_large');
    this.name = 'DeckTooLargeError';
  }
}

export interface TransformApkgInput {
  bytes: Buffer;
  transform: TransformName;
  targetLanguage?: TargetLanguage;
  imageSource?: ImageSource;
  imageCount?: number;
  pexelsApiKey?: string;
  selection?: FieldSelection;
  concurrency?: number;
  noteCap?: number;
}

export interface TransformApkgResult {
  apkg: Buffer;
  deckName: string;
  noteCount: number;
  failedCount: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    totalCalls: number;
    elapsedMs: number;
  };
}

function isCustomNoteType(transformed: TransformedNote): boolean {
  if (transformed.fields.length > 2) return true;
  const names = transformed.fieldNames.map((n) => n.toLowerCase());
  const looksLikeBasic =
    names.length === 2 &&
    (names[0]?.includes('front') || names[0] === '') &&
    (names[1]?.includes('back') || names[1] === '');
  const looksLikeCloze =
    transformed.modelKind === 'cloze' &&
    names.length <= 2 &&
    (names[0]?.includes('text') || names[0]?.includes('cloze') || names[0] === '');
  return !looksLikeBasic && !looksLikeCloze;
}

function toAnkiNote(transformed: TransformedNote): Note {
  const front = transformed.fields[0] ?? '';
  const back = transformed.fields[1] ?? '';
  if (transformed.modelKind === 'cloze') {
    const note = new Note(front, back);
    note.cloze = true;
    note.tags = transformed.tags;
    if (transformed.media && transformed.media.length > 0) {
      note.media = [...transformed.media];
    }
    if (isCustomNoteType(transformed)) {
      note.customFields = [...transformed.fields];
      note.customFieldNames = [...transformed.fieldNames];
      note.customModelName = transformed.modelName;
    }
    return note;
  }
  const renderedFront =
    transformed.hint != null && transformed.hint.length > 0
      ? `${front}<div class="hint"><small>${transformed.hint}</small></div>`
      : front;
  const note = new Note(renderedFront, back);
  note.tags = transformed.tags;
  if (transformed.media && transformed.media.length > 0) {
    note.media = [...transformed.media];
  }
  if (isCustomNoteType(transformed)) {
    note.customFields = [...transformed.fields];
    note.customFieldNames = [...transformed.fieldNames];
    note.customModelName = transformed.modelName;
  }
  return note;
}

function buildDeckFromTransformedNotes(
  deckName: string,
  notes: TransformedNote[]
): Deck {
  const settings = new CardOption(CardOption.LoadDefaultOptions());
  const ankiNotes = notes.map(toAnkiNote);
  return new Deck(deckName, ankiNotes, undefined, null, Date.now(), settings);
}

async function emitApkgFromDeck(
  deck: Deck,
  media: readonly TransformMediaFile[] = []
): Promise<Buffer> {
  const ws = new Workspace(true, 'fs');
  const exporter = new CustomExporter(deck.name, ws.location);
  exporter.configure([deck]);
  for (const file of media) {
    exporter.addMedia(file.filename, file.bytes);
  }
  await exporter.save();
  const apkg = await ws.getFirstAPKG();
  if (!apkg) throw new Error('Failed to emit transformed deck');
  return apkg;
}

export class TransformApkgUseCase {
  async execute(input: TransformApkgInput): Promise<TransformApkgResult> {
    const parsed = await parseApkgNotes(input.bytes);
    this.assertOnlyKnownModels(parsed);
    if (parsed.notes.length === 0) {
      throw new Error(EMPTY_DECK_ERROR);
    }
    if (input.noteCap != null && parsed.notes.length > input.noteCap) {
      throw new DeckTooLargeError(parsed.notes.length, input.noteCap);
    }

    const transformResult =
      input.transform === 'add_image'
        ? await transformApkgWithImages({
            notes: parsed.notes,
            source: input.imageSource ?? 'pexels',
            pexelsApiKey: input.pexelsApiKey,
            selection: input.selection,
            concurrency: input.concurrency,
            imageCount: input.imageCount,
          })
        : await transformApkgNotes({
            notes: parsed.notes,
            transform: input.transform,
            targetLanguage: input.targetLanguage,
            selection: input.selection,
            concurrency: input.concurrency,
          });

    if (transformResult.notes.length === 0) {
      throw new Error('Every note failed to transform. Try again.');
    }

    const deck = buildDeckFromTransformedNotes(
      parsed.deckName,
      transformResult.notes
    );
    const apkg = await emitApkgFromDeck(deck, transformResult.media ?? []);

    return {
      apkg,
      deckName: parsed.deckName,
      noteCount: transformResult.notes.length,
      failedCount: transformResult.failures.length,
      usage: transformResult.usage,
    };
  }

  private assertOnlyKnownModels(parsed: ParseApkgNotesResult): void {
    if (parsed.unknownModelNames.length > 0) {
      throw new Error(UNKNOWN_MODEL_ERROR);
    }
  }
}

export default TransformApkgUseCase;
