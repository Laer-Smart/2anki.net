import { unzipSync, strFromU8 } from 'fflate';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const initSqlJs = require('sql.js');

import { exportNoteTypeToApkg, AnkiNoteType } from './exportNoteTypeToApkg';
import { TemplateFieldValidationError } from './validateTemplateFields';

async function readColJson<T>(apkg: Buffer, column: 'decks' | 'models'): Promise<Record<string, T>> {
  const entries = unzipSync(new Uint8Array(apkg));
  const SQL = await initSqlJs();
  const db = new SQL.Database(entries['collection.anki2']);
  const res = db.exec(`SELECT ${column} FROM col`);
  db.close();
  return JSON.parse(res[0].values[0][0] as string);
}

function readDecksJson(apkg: Buffer) {
  return readColJson<{ id: number; name: string }>(apkg, 'decks');
}

function readModelsJson(apkg: Buffer) {
  return readColJson<{ id: number; did: number | null }>(apkg, 'models');
}

const basicNoteType: AnkiNoteType = {
  id: 1000000000000,
  name: 'Basic',
  type: 0,
  tmpls: [
    {
      name: 'Card 1',
      ord: 0,
      qfmt: '{{Front}}',
      afmt: '{{Front}}<hr id="answer">{{Back}}',
    },
  ],
  flds: [
    { name: 'Front', ord: 0 },
    { name: 'Back', ord: 1 },
  ],
  css: '.card { color: black; }',
};

describe('exportNoteTypeToApkg', () => {
  it('returns a non-empty Buffer', async () => {
    const buffer = await exportNoteTypeToApkg(basicNoteType);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('produces a zip containing collection.anki2 and a media manifest', async () => {
    const buffer = await exportNoteTypeToApkg(basicNoteType, {
      Front: 'Q',
      Back: 'A',
    });

    const entries = unzipSync(new Uint8Array(buffer));

    expect(Object.keys(entries)).toEqual(
      expect.arrayContaining(['collection.anki2', 'media'])
    );
    expect(entries['collection.anki2'].length).toBeGreaterThan(0);
    expect(strFromU8(entries.media)).toBe('{}');
  });

  it('skips writing a sample note when no previewData is supplied', async () => {
    const buffer = await exportNoteTypeToApkg(basicNoteType);

    expect(buffer.length).toBeGreaterThan(0);
  });

  it('embeds the preview note when previewData is supplied', async () => {
    const buffer = await exportNoteTypeToApkg(basicNoteType, {
      Front: 'Capital of France?',
      Back: 'Paris',
    });

    expect(buffer.length).toBeGreaterThan(0);
  });

  it('names the deck "2anki::<noteType.name>" so cards do not land in Default on import', async () => {
    const buffer = await exportNoteTypeToApkg(basicNoteType);
    const decks = await readDecksJson(buffer);

    const decksList = Object.values(decks);
    expect(decksList).toHaveLength(1);
    expect(decksList[0].name).toBe('2anki::Basic');
    expect(decksList[0].id).not.toBe(1);
  });

  it('links the note type to its deck so Add Card pre-selects the matching deck', async () => {
    const buffer = await exportNoteTypeToApkg(basicNoteType);
    const [model] = Object.values(await readModelsJson(buffer));
    const [deck] = Object.values(await readDecksJson(buffer));

    expect(typeof model.did).toBe('number');
    expect(model.did).toBe(deck.id);
  });

  it('preserves the original template name casing and punctuation in the deck name', async () => {
    const ornateNoteType: AnkiNoteType = {
      ...basicNoteType,
      name: 'Abhiyan Bhandari (Night Mode — Cloze)',
    };

    const buffer = await exportNoteTypeToApkg(ornateNoteType);
    const decks = await readDecksJson(buffer);

    expect(Object.values(decks)[0].name).toBe(
      '2anki::Abhiyan Bhandari (Night Mode — Cloze)'
    );
  });

  it('refuses to build a deck when a template references a missing field', async () => {
    const brokenNoteType: AnkiNoteType = {
      ...basicNoteType,
      tmpls: [
        {
          name: 'Card 1',
          ord: 0,
          qfmt: '{{Front}}{{#text2 image}}{{text2 image}}{{/text2 image}}',
          afmt: '{{Back}}',
        },
      ],
    };

    await expect(exportNoteTypeToApkg(brokenNoteType)).rejects.toBeInstanceOf(
      TemplateFieldValidationError
    );
  });
});
