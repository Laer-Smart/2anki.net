import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { MindmapRepositoryInterface } from '../../data_layer/MindmapRepository';
import { MindmapsId } from '../../data_layer/public/Mindmaps';
import { UsersId } from '../../data_layer/public/Users';
import { mindmapToNotes } from './mindmapToNotes';
import { mindmapToClozeNotes } from './mindmapToClozeNotes';
import { mindmapToMarkmapHtml } from './mindmapToMarkmapHtml';
import { collectMindmapImages } from './collectMindmapImages';
import { MindmapData } from './MindmapData';
import CustomExporter from '../../lib/parser/exporters/CustomExporter';
import Note from '../../lib/parser/Note';

export class MindmapNotFoundError extends Error {
  constructor() {
    super('Mind map not found');
    this.name = 'MindmapNotFoundError';
  }
}

export type MindmapCardType = 'basic' | 'cloze' | 'markmap';

interface ExportInput {
  id: MindmapsId;
  userId: UsersId;
  deckName?: string;
  cardType?: MindmapCardType;
}

function randomDeckId(): number {
  const hex = randomUUID().replace(/-/g, '').slice(0, 13);
  return Number.parseInt(hex, 16) % 1e13;
}

export class ExportMindmapUseCase {
  constructor(private readonly repo: MindmapRepositoryInterface) {}

  private buildNotes(
    data: MindmapData,
    deckName: string,
    cardType: MindmapCardType,
    filenameMap: Record<string, string>
  ): Note[] {
    if (cardType === 'markmap') {
      const html = mindmapToMarkmapHtml(data, deckName, filenameMap);
      const note = new Note(deckName, html);
      return [note];
    }
    if (cardType === 'basic') {
      return mindmapToNotes(data, filenameMap);
    }
    return mindmapToClozeNotes(data, filenameMap);
  }

  async execute(input: ExportInput): Promise<Buffer> {
    const { id, userId, deckName, cardType = 'cloze' } = input;
    const map = await this.repo.findById(id, userId);
    if (map == null) {
      throw new MindmapNotFoundError();
    }

    const resolvedDeckName = deckName ?? map.title;
    const mapData = map.data as MindmapData;
    const uploadBase = process.env.UPLOAD_BASE ?? os.tmpdir();
    const collectedImages = collectMindmapImages(mapData, uploadBase);

    const filenameMap: Record<string, string> = {};
    for (const img of collectedImages) {
      filenameMap[img.filename] = img.filename;
    }

    const notes = this.buildNotes(mapData, resolvedDeckName, cardType, filenameMap);

    const workspaceDir = path.join(os.tmpdir(), `mindmap-export-${randomUUID()}`);
    fs.mkdirSync(workspaceDir, { recursive: true });

    try {
      const deckInfo = [
        {
          name: resolvedDeckName,
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

      const exporter = new CustomExporter(resolvedDeckName, workspaceDir);
      exporter.configure(deckInfo as never);

      for (const img of collectedImages) {
        exporter.addMedia(img.filename, img.buffer);
      }

      return await exporter.save();
    } finally {
      fs.rmSync(workspaceDir, { recursive: true, force: true });
    }
  }
}
