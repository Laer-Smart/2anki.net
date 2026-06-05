import JSZip from 'jszip';
import Database from 'better-sqlite3';
import PackEditedApkgUseCase from './PackEditedApkgUseCase';
import { extractApkg } from '../../services/ApkgPreviewService/extractApkg';
import { parseCollection } from '../../services/ApkgPreviewService/parseCollection';

function buildCollectionBuffer(
  cards: Array<{ front: string; back: string }>
): Buffer {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE col (
      id INTEGER PRIMARY KEY, crt INTEGER DEFAULT 0, mod INTEGER DEFAULT 0,
      scm INTEGER DEFAULT 0, ver INTEGER DEFAULT 0, dty INTEGER DEFAULT 0,
      usn INTEGER DEFAULT 0, ls INTEGER DEFAULT 0, conf TEXT DEFAULT '{}',
      models TEXT, decks TEXT, dconf TEXT DEFAULT '{}', tags TEXT DEFAULT '{}'
    );
    CREATE TABLE notes (
      id INTEGER PRIMARY KEY, guid TEXT, mid INTEGER, mod INTEGER DEFAULT 0,
      usn INTEGER DEFAULT 0, tags TEXT, flds TEXT, sfld TEXT, csum INTEGER DEFAULT 0,
      flags INTEGER DEFAULT 0, data TEXT DEFAULT ''
    );
    CREATE TABLE cards (
      id INTEGER PRIMARY KEY, nid INTEGER, did INTEGER, ord INTEGER, mod INTEGER DEFAULT 0,
      usn INTEGER DEFAULT 0, type INTEGER DEFAULT 0, queue INTEGER DEFAULT 0,
      due INTEGER DEFAULT 0, ivl INTEGER DEFAULT 0, factor INTEGER DEFAULT 0,
      reps INTEGER DEFAULT 0, lapses INTEGER DEFAULT 0, left INTEGER DEFAULT 0,
      odue INTEGER DEFAULT 0, odid INTEGER DEFAULT 0, flags INTEGER DEFAULT 0,
      data TEXT DEFAULT ''
    );
  `);
  const models = {
    '1': {
      id: 1,
      name: 'Basic',
      type: 0,
      css: '',
      flds: [
        { name: 'Front', ord: 0 },
        { name: 'Back', ord: 1 },
      ],
      tmpls: [{ name: 'Card 1', ord: 0, qfmt: '{{Front}}', afmt: '{{Back}}' }],
    },
  };
  const decks = { '2': { id: 2, name: 'Test' } };
  db.prepare('INSERT INTO col (id, models, decks) VALUES (1, ?, ?)').run(
    JSON.stringify(models),
    JSON.stringify(decks)
  );
  for (let i = 0; i < cards.length; i++) {
    const noteId = i + 10;
    const cardId = i + 100;
    db.prepare(
      "INSERT INTO notes (id, guid, mid, tags, flds, sfld) VALUES (?, ?, 1, ' ', ?, ?)"
    ).run(
      noteId,
      `guid${i}`,
      `${cards[i].front}\x1f${cards[i].back}`,
      cards[i].front
    );
    db.prepare('INSERT INTO cards (id, nid, did, ord) VALUES (?, ?, 2, 0)').run(
      cardId,
      noteId
    );
  }
  const buf = Buffer.from(db.serialize());
  db.close();
  return buf;
}

async function buildApkgBuffer(
  cards: Array<{ front: string; back: string }>
): Promise<Buffer> {
  const col = buildCollectionBuffer(cards);
  const zip = new JSZip();
  zip.file('collection.anki2', col);
  zip.file('media', '{}');
  return zip.generateAsync({ type: 'nodebuffer' });
}

const useCase = new PackEditedApkgUseCase();

describe('PackEditedApkgUseCase', () => {
  it('returns an .apkg with all cards when edits is empty', async () => {
    const apkg = await buildApkgBuffer([
      { front: 'Q1', back: 'A1' },
      { front: 'Q2', back: 'A2' },
    ]);
    const result = await useCase.execute({
      sourceBytes: apkg,
      filename: 'deck.apkg',
      edits: [],
    });
    const archive = await extractApkg(result.buffer);
    const col = parseCollection(archive.collectionBuffer);
    expect(col.cards).toHaveLength(2);
  });

  it('omits deleted cards from the output .apkg', async () => {
    const apkg = await buildApkgBuffer([
      { front: 'Q1', back: 'A1' },
      { front: 'Q2', back: 'A2' },
      { front: 'Q3', back: 'A3' },
    ]);
    const result = await useCase.execute({
      sourceBytes: apkg,
      filename: 'deck.apkg',
      edits: [{ cardIndex: 1, deleted: true }],
    });
    const archive = await extractApkg(result.buffer);
    const col = parseCollection(archive.collectionBuffer);
    expect(col.cards).toHaveLength(2);
  });

  it('applies front text edit to the matching note', async () => {
    const apkg = await buildApkgBuffer([{ front: 'original', back: 'A1' }]);
    const result = await useCase.execute({
      sourceBytes: apkg,
      filename: 'deck.apkg',
      edits: [{ cardIndex: 0, front: 'edited front' }],
    });
    const archive = await extractApkg(result.buffer);
    const col = parseCollection(archive.collectionBuffer);
    const note = col.notes.get(10);
    expect(note?.fields[0]).toBe('edited front');
  });

  it('applies back text edit to the matching note', async () => {
    const apkg = await buildApkgBuffer([{ front: 'Q', back: 'original back' }]);
    const result = await useCase.execute({
      sourceBytes: apkg,
      filename: 'deck.apkg',
      edits: [{ cardIndex: 0, back: 'edited back' }],
    });
    const archive = await extractApkg(result.buffer);
    const col = parseCollection(archive.collectionBuffer);
    const note = col.notes.get(10);
    expect(note?.fields[1]).toBe('edited back');
  });

  it('sets queue=-1 on suspended cards', async () => {
    const apkg = await buildApkgBuffer([
      { front: 'Q1', back: 'A1' },
      { front: 'Q2', back: 'A2' },
    ]);
    const result = await useCase.execute({
      sourceBytes: apkg,
      filename: 'deck.apkg',
      edits: [{ cardIndex: 0, suspended: true }],
    });
    const archive = await extractApkg(result.buffer);
    const col = parseCollection(archive.collectionBuffer);
    const cardId = col.cards[0].id;
    const tmpDb = new Database(archive.collectionBuffer);
    const row = tmpDb
      .prepare('SELECT queue FROM cards WHERE id = ?')
      .get(cardId) as { queue: number } | undefined;
    tmpDb.close();
    expect(row?.queue).toBe(-1);
  });

  it('returns a filename with -edited suffix', async () => {
    const apkg = await buildApkgBuffer([{ front: 'Q', back: 'A' }]);
    const result = await useCase.execute({
      sourceBytes: apkg,
      filename: 'my-deck.apkg',
      edits: [],
    });
    expect(result.filename).toBe('my-deck-edited.apkg');
  });
});
