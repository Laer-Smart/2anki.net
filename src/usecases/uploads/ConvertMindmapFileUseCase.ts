import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

import { parseOpml } from '../../lib/parser/parsers/parseOpml';
import { parseBrainstormsJson } from '../../lib/parser/parsers/parseBrainstormsJson';
import { mindmapToNotes } from '../mindmaps/mindmapToNotes';
import { MindmapData } from '../mindmaps/MindmapData';
import CustomExporter from '../../lib/parser/exporters/CustomExporter';
import { isOpmlFile, isBrainstormsJsonFile } from '../../lib/storage/checks';
import getDeckFilename from '../../lib/anki/getDeckFilename';

function randomDeckId(): number {
  const hex = randomUUID().replace(/-/g, '').slice(0, 13);
  return Number.parseInt(hex, 16) % 1e13;
}

function parseMindmapFile(filename: string, content: string): MindmapData {
  if (isOpmlFile(filename)) return parseOpml(content);
  if (isBrainstormsJsonFile(filename)) return parseBrainstormsJson(content);
  throw new Error(`Unsupported mindmap file format: ${filename}`);
}

export interface MindmapConversionResult {
  cardCount: number;
  deckName: string;
}

export async function convertMindmapFileToApkg(
  filename: string,
  content: Buffer,
  outputDir: string
): Promise<MindmapConversionResult> {
  const deckName = filename
    .replace(/\.brainstorms\.json$/i, '')
    .replace(/\.opml$/i, '');

  const data = parseMindmapFile(filename, content.toString('utf-8'));
  const notes = mindmapToNotes(data);

  fs.mkdirSync(outputDir, { recursive: true });
  const deckInfo = [
    {
      name: deckName,
      image: '',
      style: null,
      id: randomDeckId(),
      settings: {
        template: 'specialstyle',
        clozeModelName: 'n2a-cloze',
        basicModelName: 'n2a-basic',
        inputModelName: 'n2a-input',
        useNotionId: false,
      },
      cards: notes.map((note, index) => ({
        name: note.name,
        back: note.back,
        tags: note.tags,
        cloze: note.cloze,
        number: index,
        enableInput: note.enableInput,
        answer: note.answer,
        media: note.media,
      })),
    },
  ];

  const exporter = new CustomExporter(deckName, outputDir);
  exporter.configure(deckInfo as never);
  await exporter.save();

  return { cardCount: notes.length, deckName: getDeckFilename(deckName) };
}
