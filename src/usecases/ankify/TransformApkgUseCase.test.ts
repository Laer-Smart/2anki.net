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
  return {
    __esModule: true,
    default: class FakeExporter {
      constructor(public name: string, public workspaceLocation: string) {}
      configure() {}
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

beforeEach(() => {
  process.env.WORKSPACE_BASE = process.env.WORKSPACE_BASE ?? '/tmp/2anki-transform-test';
});

function makeParsed(notes: ParsedNote[], unknown: string[] = []): parseModule.ParseApkgNotesResult {
  return { notes, unknownModelNames: unknown, deckName: 'Pharmacology' };
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
