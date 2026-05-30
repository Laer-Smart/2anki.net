import ExportApkgToCsvUseCase, {
  EmptyDeckError,
  CardLimitExceededError,
  CSV_FREE_NOTE_LIMIT,
} from './ExportApkgToCsvUseCase';
import * as parseApkgNotesModule from '../../services/ApkgPreviewService/parseApkgNotes';
import { ParsedNote } from '../../lib/ankify/transforms/types';

function note(fields: string[], tags: string[] = []): ParsedNote {
  return {
    guid: `g-${fields.join('-')}`,
    modelKind: 'basic',
    modelName: 'Basic',
    fields,
    fieldNames: ['Front', 'Back'],
    tags,
  };
}

describe('ExportApkgToCsvUseCase', () => {
  const parseSpy = jest.spyOn(parseApkgNotesModule, 'parseApkgNotes');

  beforeEach(() => {
    parseSpy.mockReset();
  });

  it('returns CSV bytes, the deck name, and a note count for a valid .apkg', async () => {
    parseSpy.mockResolvedValue({
      notes: [note(['Q1', 'A1'], ['tagA']), note(['Q2', 'A2'])],
      unknownModelNames: [],
      deckName: 'Spanish 101',
      sourceMedia: [],
    });
    const useCase = new ExportApkgToCsvUseCase();
    const result = await useCase.execute(Buffer.from('fake-apkg'), true);
    expect(result.deckName).toBe('Spanish 101');
    expect(result.noteCount).toBe(2);
    const csv = result.csv.toString('utf8').replace(/^﻿/, '');
    expect(csv.split('\r\n')[0]).toBe('Model,Front,Back,Tags');
    expect(csv).toContain('Basic,Q1,A1,tagA');
    expect(csv).toContain('Basic,Q2,A2,');
  });

  it('throws EmptyDeckError when no notes are parsed from the file', async () => {
    parseSpy.mockResolvedValue({
      notes: [],
      unknownModelNames: ['Custom Note Type'],
      deckName: 'Empty',
      sourceMedia: [],
    });
    const useCase = new ExportApkgToCsvUseCase();
    await expect(
      useCase.execute(Buffer.from('fake-apkg'), false)
    ).rejects.toBeInstanceOf(EmptyDeckError);
  });

  it('throws CardLimitExceededError for free users when notes exceed the cap', async () => {
    const many = Array.from({ length: CSV_FREE_NOTE_LIMIT + 1 }, (_, i) =>
      note([`Q${i}`, `A${i}`])
    );
    parseSpy.mockResolvedValue({
      notes: many,
      unknownModelNames: [],
      deckName: 'Big deck',
      sourceMedia: [],
    });
    const useCase = new ExportApkgToCsvUseCase();
    await expect(
      useCase.execute(Buffer.from('fake-apkg'), false)
    ).rejects.toBeInstanceOf(CardLimitExceededError);
  });

  it('does not apply the cap when the user is on the paid plan', async () => {
    const many = Array.from({ length: CSV_FREE_NOTE_LIMIT + 100 }, (_, i) =>
      note([`Q${i}`, `A${i}`])
    );
    parseSpy.mockResolvedValue({
      notes: many,
      unknownModelNames: [],
      deckName: 'Big deck',
      sourceMedia: [],
    });
    const useCase = new ExportApkgToCsvUseCase();
    const result = await useCase.execute(Buffer.from('fake-apkg'), true);
    expect(result.noteCount).toBe(CSV_FREE_NOTE_LIMIT + 100);
  });

  it('returns CSV as a UTF-8 Buffer with a BOM so Excel opens accented text cleanly', async () => {
    parseSpy.mockResolvedValue({
      notes: [note(['¿Cómo estás?', 'Bien'])],
      unknownModelNames: [],
      deckName: 'Español',
      sourceMedia: [],
    });
    const useCase = new ExportApkgToCsvUseCase();
    const result = await useCase.execute(Buffer.from('fake-apkg'), true);
    expect(result.csv[0]).toBe(0xef);
    expect(result.csv[1]).toBe(0xbb);
    expect(result.csv[2]).toBe(0xbf);
    expect(result.csv.toString('utf8')).toContain('¿Cómo estás?');
  });
});
