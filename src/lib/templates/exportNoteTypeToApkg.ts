import crypto from 'node:crypto';
import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const initSqlJs = require('sql.js');
import { zipSync } from 'fflate';

import {
  TemplateFieldValidationError,
  validateTemplateFields,
} from './validateTemplateFields';

const FIELD_SEPARATOR = '\x1f';

function randomGuid(): string {
  return crypto.randomBytes(8).toString('base64url').slice(0, 10);
}

function computeSfldChecksum(sfld: string): number {
  let hash = 0;
  for (const char of sfld) {
    hash = Math.trunc(hash * 31 + (char.codePointAt(0) ?? 0));
  }
  return hash >>> 0;
}

function locateSqlWasm(filename: string): string {
  const wasmJsPath = require.resolve('sql.js/dist/sql-wasm.js');
  return path.join(path.dirname(wasmJsPath), filename);
}

export interface AnkiCardTemplate {
  name: string;
  ord: number;
  qfmt: string;
  afmt: string;
  bqfmt?: string;
  bafmt?: string;
}

export interface AnkiNoteField {
  name: string;
  ord: number;
}

export interface AnkiNoteType {
  id: number;
  name: string;
  type: number;
  tmpls: AnkiCardTemplate[];
  flds: AnkiNoteField[];
  css: string;
}

export type PreviewData = Record<string, string>;

function buildSchema(db: import('sql.js').Database) {
  db.run(`
    CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null, dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null, decks text not null, dconf text not null, tags text not null);
    CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null, tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null);
    CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null, usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null, factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null, odid integer not null, flags integer not null, data text not null);
    CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null, lastIvl integer not null, factor integer not null, time integer not null, type integer not null);
    CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
    CREATE INDEX ix_notes_usn on notes (usn);
    CREATE INDEX ix_cards_usn on cards (usn);
    CREATE INDEX ix_cards_nid on cards (nid);
    CREATE INDEX ix_cards_sched on cards (did, queue, due);
    CREATE INDEX ix_notes_csum on notes (csum);
  `);
}

function buildModel(
  noteType: AnkiNoteType,
  modelId: number,
  deckId: number,
  now: number
) {
  return {
    [modelId]: {
      id: modelId,
      name: noteType.name,
      type: noteType.type ?? 0,
      mod: now,
      usn: -1,
      sortf: 0,
      did: deckId,
      tmpls: noteType.tmpls.map((t) => ({
        name: t.name,
        ord: t.ord,
        qfmt: t.qfmt,
        afmt: t.afmt,
        bqfmt: t.bqfmt ?? '',
        bafmt: t.bafmt ?? '',
        did: null,
        bfont: '',
        bsize: 0,
      })),
      flds: noteType.flds.map((f) => ({
        name: f.name,
        ord: f.ord,
        sticky: false,
        rtl: false,
        font: 'Arial',
        size: 20,
        description: '',
      })),
      css: noteType.css ?? '',
      latexPre: String.raw`\documentclass[12pt]{article}
\special{papersize=3in,5in}
\usepackage[utf8]{inputenc}
\usepackage{amssymb,amsmath}
\pagestyle{empty}
\setlength{\parindent}{0in}
\begin{document}
`,
      latexPost: String.raw`\end{document}`,
      latexsvg: false,
      req: noteType.tmpls.map((_, i) => [i, 'all', [0]]),
    },
  };
}

function buildDeck(deckId: number, name: string, now: number) {
  return {
    [deckId]: {
      id: deckId,
      name,
      desc: '',
      conf: 1,
      extendRev: 50,
      usn: 0,
      collapsed: false,
      newToday: [0, 0],
      timeToday: [0, 0],
      dyn: 0,
      extendNew: 10,
      revToday: [0, 0],
      lrnToday: [0, 0],
      mod: now,
      browserCollapsed: false,
    },
  };
}

function buildConf(deckId: number, modelId: number) {
  return {
    nextPos: 1,
    estTimes: true,
    activeDecks: [deckId],
    sortField: 0,
    timeLim: 0,
    htmlArs: false,
    activeCols: ['noteFld', 'template', 'cardDue', 'deck'],
    dueCounts: true,
    curModel: String(modelId),
    newBury: true,
    newSpread: 0,
    decks: 1,
    sortBackwards: false,
    addToCur: true,
  };
}

function buildDconf(now: number) {
  return {
    '1': {
      id: 1,
      mod: now,
      name: 'Default',
      usn: -1,
      maxTaken: 60,
      autoplay: true,
      timer: 0,
      replayq: true,
      new: {
        delays: [1, 10],
        ints: [1, 4, 7],
        initialFactor: 2500,
        order: 1,
        perDay: 20,
        bury: false,
        separate: true,
      },
      lapse: { delays: [10], leechFails: 8, leechAction: 0, minInt: 1, mult: 0 },
      rev: {
        perDay: 200,
        ease4: 1.3,
        fuzz: 0.05,
        minSpace: 1,
        ivlFct: 1,
        maxIvl: 36500,
        bury: false,
        hardFactor: 1.2,
      },
    },
  };
}

function insertPreviewNote(
  db: import('sql.js').Database,
  noteType: AnkiNoteType,
  previewData: PreviewData,
  modelId: number,
  deckId: number,
  now: number
) {
  const fieldValues = noteType.flds
    .map((f) => previewData[f.name] ?? '')
    .join(FIELD_SEPARATOR);

  const sfld = previewData[noteType.flds[0]?.name] ?? '';
  const noteId = now * 1000;
  const guid = randomGuid();
  const csum = computeSfldChecksum(sfld);

  db.run('INSERT INTO notes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    noteId,
    guid,
    modelId,
    now,
    -1,
    '',
    fieldValues,
    sfld,
    csum,
    0,
    '',
  ]);

  noteType.tmpls.forEach((_tmpl, ord) => {
    db.run(
      'INSERT INTO cards VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        noteId + ord,
        noteId,
        deckId,
        ord,
        now,
        -1,
        0,
        0,
        ord,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        '',
      ]
    );
  });
}

export async function exportNoteTypeToApkg(
  noteType: AnkiNoteType,
  previewData: PreviewData = {}
): Promise<Buffer> {
  const validation = validateTemplateFields(noteType);
  if (!validation.ok) {
    throw new TemplateFieldValidationError(validation.missing, validation.message);
  }

  const SQL = await initSqlJs({ locateFile: locateSqlWasm });
  const db = new SQL.Database();

  buildSchema(db);

  const now = Math.floor(Date.now() / 1000);
  const modelId = noteType.id || Date.now();
  const deckId = Date.now() + 1;
  const deckName = `2anki::${noteType.name}`;

  const model = buildModel(noteType, modelId, deckId, now);
  const deck = buildDeck(deckId, deckName, now);
  const conf = buildConf(deckId, modelId);
  const dconf = buildDconf(now);

  db.run('INSERT INTO col VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    1,
    now,
    now,
    now,
    11,
    0,
    -1,
    0,
    JSON.stringify(conf),
    JSON.stringify(model),
    JSON.stringify(deck),
    JSON.stringify(dconf),
    '{}',
  ]);

  if (Object.keys(previewData).length > 0) {
    insertPreviewNote(db, noteType, previewData, modelId, deckId, now);
  }

  const dbData = db.export();
  db.close();

  const zip = zipSync({
    'collection.anki2': dbData,
    media: new TextEncoder().encode('{}'),
  });

  return Buffer.from(zip);
}
