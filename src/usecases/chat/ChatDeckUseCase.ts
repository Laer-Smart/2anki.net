import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import CustomExporter from '../../lib/parser/exporters/CustomExporter';

export interface ChatDeckCard {
  front: string;
  back: string;
  options?: string[];
  correctIndex?: number;
  rationale?: string;
}

export interface ChatDeckInput {
  cards: ChatDeckCard[];
  deckName: string;
}

function isMcqCard(card: ChatDeckCard): boolean {
  return Array.isArray(card.options) && typeof card.correctIndex === 'number';
}

function randomDeckId(): number {
  const hex = createHash('sha1').update(randomUUID()).digest('hex').slice(0, 13);
  return Number.parseInt(hex, 16) % 1e13;
}

const CLOZE_PATTERN = /\{\{c\d+::/;
const BLANK_PATTERN = /_{2,}/;

export function looksLikeCloze(front: string): boolean {
  return CLOZE_PATTERN.test(front);
}

export function transformBlankToCloze(card: ChatDeckCard): ChatDeckCard {
  if (CLOZE_PATTERN.test(card.front)) return card;
  if (!BLANK_PATTERN.test(card.front)) return card;
  const trimmedBack = card.back.trim();
  if (trimmedBack.length === 0) return card;
  return {
    front: card.front.replace(BLANK_PATTERN, `{{c1::${trimmedBack}}}`),
    back: '',
  };
}

export class ChatDeckUseCase {
  async execute(input: ChatDeckInput): Promise<Buffer> {
    const { cards, deckName } = input;
    const workspaceDir = path.join(os.tmpdir(), `chat-deck-${randomUUID()}`);
    fs.mkdirSync(workspaceDir, { recursive: true });

    try {
      const normalizedCards = cards.map((c) => (isMcqCard(c) ? c : transformBlankToCloze(c)));
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
          cards: normalizedCards.map((c, index) => {
            const base = {
              name: c.front,
              tags: [],
              number: index,
              enableInput: false,
              answer: '',
              media: [],
            };
            if (isMcqCard(c)) {
              return {
                ...base,
                back: c.rationale ?? '',
                cloze: false,
                mcq: true,
                options: c.options,
                correctIndices: [c.correctIndex],
              };
            }
            return {
              ...base,
              back: c.back,
              cloze: looksLikeCloze(c.front),
            };
          }),
        },
      ];

      const exporter = new CustomExporter(deckName, workspaceDir);
      exporter.configure(deckInfo as never);
      return await exporter.save();
    } finally {
      fs.rmSync(workspaceDir, { recursive: true, force: true });
    }
  }
}
