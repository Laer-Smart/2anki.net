import Deck from '../../lib/parser/Deck';
import Note from '../../lib/parser/Note';
import CardOption from '../../lib/parser/Settings';
import Workspace from '../../lib/parser/WorkSpace';
import CustomExporter from '../../lib/parser/exporters/CustomExporter';
import {
  parseApkgNotes,
  ParseApkgNotesResult,
} from '../../services/ApkgPreviewService/parseApkgNotes';
import { transformApkgNotes } from '../../services/ankify/transformService';
import {
  TargetLanguage,
  TransformedNote,
  TransformName,
} from '../../lib/ankify/transforms/types';

export const UNKNOWN_MODEL_ERROR =
  "This deck uses a note type we don't support yet. v1 supports Basic and Cloze decks.";

export const EMPTY_DECK_ERROR =
  "We couldn't find any Basic or Cloze notes in this deck.";

export interface TransformApkgInput {
  bytes: Buffer;
  transform: TransformName;
  targetLanguage?: TargetLanguage;
  concurrency?: number;
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

function toAnkiNote(transformed: TransformedNote): Note {
  if (transformed.modelKind === 'cloze') {
    const note = new Note(transformed.front, transformed.back);
    note.cloze = true;
    note.tags = transformed.tags;
    return note;
  }
  const front =
    transformed.hint != null && transformed.hint.length > 0
      ? `${transformed.front}<div class="hint"><small>${transformed.hint}</small></div>`
      : transformed.front;
  const note = new Note(front, transformed.back);
  note.tags = transformed.tags;
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

async function emitApkgFromDeck(deck: Deck): Promise<Buffer> {
  const ws = new Workspace(true, 'fs');
  const exporter = new CustomExporter(deck.name, ws.location);
  exporter.configure([deck]);
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

    const transformResult = await transformApkgNotes({
      notes: parsed.notes,
      transform: input.transform,
      targetLanguage: input.targetLanguage,
      concurrency: input.concurrency,
    });

    if (transformResult.notes.length === 0) {
      throw new Error('Every note failed to transform. Try again.');
    }

    const deck = buildDeckFromTransformedNotes(
      parsed.deckName,
      transformResult.notes
    );
    const apkg = await emitApkgFromDeck(deck);

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
