import { parseApkgNotes } from '../../services/ApkgPreviewService/parseApkgNotes';
import { buildCsvFromApkgNotes } from '../../lib/csv/buildCsvFromApkgNotes';

export const CSV_FREE_NOTE_LIMIT = 100;

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

export class EmptyDeckError extends Error {
  constructor() {
    super('No notes found in this .apkg file.');
    this.name = 'EmptyDeckError';
  }
}

export class CardLimitExceededError extends Error {
  constructor(
    public readonly noteCount: number,
    public readonly noteLimit: number
  ) {
    super(
      `${noteCount} notes — over the free limit of ${noteLimit}. Upgrade for no monthly cap.`
    );
    this.name = 'CardLimitExceededError';
  }
}

export interface ExportApkgToCsvResult {
  csv: Buffer;
  deckName: string;
  noteCount: number;
}

export default class ExportApkgToCsvUseCase {
  async execute(
    fileBuffer: Buffer,
    unlimitedAccess: boolean
  ): Promise<ExportApkgToCsvResult> {
    const parsed = await parseApkgNotes(fileBuffer);
    if (parsed.notes.length === 0) {
      throw new EmptyDeckError();
    }
    if (!unlimitedAccess && parsed.notes.length > CSV_FREE_NOTE_LIMIT) {
      throw new CardLimitExceededError(
        parsed.notes.length,
        CSV_FREE_NOTE_LIMIT
      );
    }
    const csvText = buildCsvFromApkgNotes(parsed.notes);
    const csv = Buffer.concat([UTF8_BOM, Buffer.from(csvText, 'utf8')]);
    return {
      csv,
      deckName: parsed.deckName,
      noteCount: parsed.notes.length,
    };
  }
}
