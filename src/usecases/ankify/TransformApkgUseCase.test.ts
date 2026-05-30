import {
  TransformApkgUseCase,
  UNKNOWN_MODEL_ERROR,
  EMPTY_DECK_ERROR,
  DeckTooLargeError,
} from './TransformApkgUseCase';
import * as parseModule from '../../services/ApkgPreviewService/parseApkgNotes';
import * as transformModule from '../../services/ankify/transformService';
import { ParsedNote, TransformedNote } from '../../lib/ankify/transforms/types';

jest.mock('../../lib/parser/exporters/CustomExporter', () => {
  const addedMedia: Array<{ filename: string; bytes: Buffer }> = [];
  let configuredDecks: unknown[] = [];
  return {
    __esModule: true,
    default: class FakeExporter {
      static __addedMedia(): Array<{ filename: string; bytes: Buffer }> {
        return addedMedia;
      }
      static __configuredDecks(): unknown[] {
        return configuredDecks;
      }
      static __reset(): void {
        addedMedia.length = 0;
        configuredDecks = [];
      }
      constructor(public name: string, public workspaceLocation: string) {}
      configure(decks: unknown[]): void {
        configuredDecks = decks;
      }
      addMedia(filename: string, bytes: Buffer): void {
        addedMedia.push({ filename, bytes });
      }
      async save(): Promise<Buffer> {
        const fs = await import('node:fs/promises');
        const path = await import('node:path');
        const target = path.join(this.workspaceLocation, 'out.apkg');
        await fs.writeFile(target, Buffer.from('apkg-bytes'));
        return Buffer.from('apkg-bytes');
      }
    },
  };
});

const FakeExporter = jest.requireMock(
  '../../lib/parser/exporters/CustomExporter'
).default as {
  __addedMedia(): Array<{ filename: string; bytes: Buffer }>;
  __configuredDecks(): Array<{ cards: Array<{ media: string[] }> }>;
  __reset(): void;
};

beforeEach(() => {
  process.env.WORKSPACE_BASE = process.env.WORKSPACE_BASE ?? '/tmp/2anki-transform-test';
  FakeExporter.__reset();
});

function makeParsed(
  notes: ParsedNote[],
  unknown: string[] = [],
  sourceMedia: parseModule.SourceMediaFile[] = []
): parseModule.ParseApkgNotesResult {
  return { notes, unknownModelNames: unknown, deckName: 'Pharmacology', sourceMedia };
}

function makeNote(id: string): ParsedNote {
  return {
    guid: id,
    modelKind: 'basic',
    modelName: 'Basic',
    fields: [`Front ${id}`, `Back ${id}`],
    fieldNames: ['Front', 'Back'],
    tags: [],
  };
}

function transformed(id: string, overrides: Partial<TransformedNote> = {}): TransformedNote {
  return {
    guid: id,
    modelKind: 'basic',
    modelName: 'Basic',
    fields: [`Front ${id}`, `Back ${id}`],
    fieldNames: ['Front', 'Back'],
    tags: [],
    ...overrides,
  };
}

describe('TransformApkgUseCase', () => {
  it('rejects decks with unknown note types at upload time', async () => {
    jest
      .spyOn(parseModule, 'parseApkgNotes')
      .mockResolvedValueOnce(makeParsed([], ['Image Occlusion Enhanced']));
    const spy = jest.spyOn(transformModule, 'transformApkgNotes');

    const useCase = new TransformApkgUseCase();
    await expect(
      useCase.execute({
        bytes: Buffer.from('x'),
        transform: 'translate_back',
        targetLanguage: 'Spanish',
      })
    ).rejects.toThrow(UNKNOWN_MODEL_ERROR);
    expect(spy).not.toHaveBeenCalled();
  });

  it('throws when the deck contains no Basic or Cloze notes', async () => {
    jest
      .spyOn(parseModule, 'parseApkgNotes')
      .mockResolvedValueOnce(makeParsed([]));

    const useCase = new TransformApkgUseCase();
    await expect(
      useCase.execute({
        bytes: Buffer.from('x'),
        transform: 'add_hint',
      })
    ).rejects.toThrow(EMPTY_DECK_ERROR);
  });

  it('throws DeckTooLargeError when the deck exceeds the per-job cap', async () => {
    const oversized = [makeNote('a'), makeNote('b'), makeNote('c')];
    jest
      .spyOn(parseModule, 'parseApkgNotes')
      .mockResolvedValueOnce(makeParsed(oversized));
    const transformSpy = jest.spyOn(transformModule, 'transformApkgNotes');

    const useCase = new TransformApkgUseCase();
    const promise = useCase.execute({
      bytes: Buffer.from('x'),
      transform: 'add_hint',
      noteCap: 2,
    });
    await expect(promise).rejects.toBeInstanceOf(DeckTooLargeError);
    await promise.catch((err: DeckTooLargeError) => {
      expect(err.noteCount).toBe(3);
      expect(err.noteCap).toBe(2);
    });
    expect(transformSpy).not.toHaveBeenCalled();
  });

  it('passes source-deck media through to the exporter', async () => {
    jest.spyOn(parseModule, 'parseApkgNotes').mockResolvedValueOnce(
      makeParsed(
        [makeNote('a')],
        [],
        [{ filename: 'Chugoku.png', bytes: Buffer.from('chugoku-bytes') }]
      )
    );
    jest.spyOn(transformModule, 'transformApkgNotes').mockResolvedValueOnce({
      notes: [transformed('a')],
      failures: [],
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUsd: 0,
        totalCalls: 1,
        elapsedMs: 1,
      },
    });

    await new TransformApkgUseCase().execute({
      bytes: Buffer.from('x'),
      transform: 'add_hint',
    });

    const added = FakeExporter.__addedMedia();
    expect(added).toContainEqual({
      filename: 'Chugoku.png',
      bytes: Buffer.from('chugoku-bytes'),
    });
  });

  it('attaches referenced source-deck images to each note media list', async () => {
    const noteWithImage: ParsedNote = {
      guid: 'a',
      modelKind: 'basic',
      modelName: 'Basic',
      fields: ['<img src="Chugoku.png"><br>Front a', 'Back a'],
      fieldNames: ['Front', 'Back'],
      tags: [],
    };
    jest.spyOn(parseModule, 'parseApkgNotes').mockResolvedValueOnce(
      makeParsed(
        [noteWithImage],
        [],
        [{ filename: 'Chugoku.png', bytes: Buffer.from('chugoku-bytes') }]
      )
    );
    jest.spyOn(transformModule, 'transformApkgNotes').mockResolvedValueOnce({
      notes: [
        transformed('a', {
          fields: ['<img src="Chugoku.png"><br>Front a', 'Back a + hint'],
        }),
      ],
      failures: [],
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUsd: 0,
        totalCalls: 1,
        elapsedMs: 1,
      },
    });

    await new TransformApkgUseCase().execute({
      bytes: Buffer.from('x'),
      transform: 'add_hint',
    });

    const decks = FakeExporter.__configuredDecks();
    expect(decks).toHaveLength(1);
    expect(decks[0].cards[0].media).toContain('Chugoku.png');
  });

  it('returns an apkg buffer with the transformed note count', async () => {
    jest
      .spyOn(parseModule, 'parseApkgNotes')
      .mockResolvedValueOnce(makeParsed([makeNote('a'), makeNote('b')]));
    jest.spyOn(transformModule, 'transformApkgNotes').mockResolvedValueOnce({
      notes: [transformed('a'), transformed('b')],
      failures: [],
      usage: {
        inputTokens: 200,
        outputTokens: 40,
        estimatedCostUsd: 0.001,
        totalCalls: 2,
        elapsedMs: 50,
      },
    });

    const useCase = new TransformApkgUseCase();
    const result = await useCase.execute({
      bytes: Buffer.from('x'),
      transform: 'add_hint',
    });

    expect(result.apkg).toBeInstanceOf(Buffer);
    expect(result.noteCount).toBe(2);
    expect(result.deckName).toBe('Pharmacology');
    expect(result.failedCount).toBe(0);
    expect(result.usage.estimatedCostUsd).toBeGreaterThanOrEqual(0);
  });
});
