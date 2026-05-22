import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

import { MindmapRepositoryInterface } from '../../data_layer/MindmapRepository';
import { MindmapsId } from '../../data_layer/public/Mindmaps';
import { UsersId } from '../../data_layer/public/Users';
import { mindmapToNotes } from './mindmapToNotes';
import CustomExporter from '../../lib/parser/exporters/CustomExporter';

export class MindmapNotFoundError extends Error {
  constructor() {
    super('Mind map not found');
    this.name = 'MindmapNotFoundError';
  }
}

interface ExportInput {
  id: MindmapsId;
  userId: UsersId;
  deckName?: string;
}

function randomDeckId(): number {
  const hex = createHash('sha1').update(randomUUID()).digest('hex').slice(0, 13);
  return Number.parseInt(hex, 16) % 1e13;
}

export class ExportMindmapUseCase {
  constructor(private readonly repo: MindmapRepositoryInterface) {}

  async execute(input: ExportInput): Promise<Buffer> {
    const { id, userId, deckName } = input;
    const map = await this.repo.findById(id, userId);
    if (map == null) {
      throw new MindmapNotFoundError();
    }

    const resolvedDeckName = deckName ?? map.title;
    const notes = mindmapToNotes(map.data);

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
      return await exporter.save();
    } finally {
      fs.rmSync(workspaceDir, { recursive: true, force: true });
    }
  }
}
