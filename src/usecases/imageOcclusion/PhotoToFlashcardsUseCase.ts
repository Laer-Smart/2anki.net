import fs from 'node:fs';
import path from 'node:path';
import os, { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';

import { getAnthropicClient } from '../../lib/claude/ClaudeService';
import { countVisionTokens, VISION_TOKEN_CEILING, VisionMediaType } from '../../lib/claude/countVisionTokens';
import { CREATE_DECK_DIR } from '../../lib/constants';
import { track } from '../../services/events/track';
import type { IEventsRepository } from '../../data_layer/EventsRepository';

export const FREE_PHOTO_QUOTA_PER_MONTH = 5;
const VISION_PHOTO_EVENT = 'vision_photo_converted';

export interface PhotoToFlashcardsInput {
  imageBase64: string;
  mediaType: VisionMediaType;
  deckName: string;
  owner: string;
  isPaying: boolean;
  imageDimensions: { width: number; height: number };
  tokenCeilingOverride?: number;
}

export interface PhotoToFlashcardsResult {
  apkgPath: string;
  cardCount: number;
  estimatedCostUsd: number;
  tileCount: number;
}

function ownerToUserId(owner: string): number | null {
  const n = Number(owner);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function startOfMonth(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

const VISION_PROMPT = `Extract atomic question-and-answer flashcard pairs from this image.

Output ONLY a compact JSON array. Format (nothing else — no markdown, no explanation):
[{"deck":"Deck Name","cards":[{"q":"front text","a":"back text"}]}]

Rules:
- Each card tests one atomic fact
- Q is the question or term, A is the answer or definition
- Preserve important formatting but keep cards concise
- Use the image content as the deck name if no other name is obvious`;

const INPUT_COST_PER_MILLION = 3;
const OUTPUT_COST_PER_MILLION = 15;

function findPython(): string {
  const envOverride = process.env.PYTHON ?? process.env.ANKI_PYTHON;
  if (envOverride) return envOverride;

  const venvPython = path.join(CREATE_DECK_DIR, 'venv', 'bin', 'python3');
  if (fs.existsSync(venvPython)) return venvPython;

  if (process.platform === 'win32') {
    const localPython = path.join(
      homedir(),
      'AppData',
      'Local',
      'Programs',
      'Python',
      'Python38',
      'python.exe'
    );
    if (fs.existsSync(localPython)) return localPython;
    for (const cmd of ['py', 'python', 'python3']) {
      try {
        execFileSync(cmd, ['--version'], { stdio: 'ignore' });
        return cmd;
      } catch {
        continue;
      }
    }
  }

  for (const p of ['/opt/homebrew/bin/python3', '/usr/local/bin/python3', '/usr/bin/python3']) {
    if (fs.existsSync(p)) return p;
  }

  return 'python3';
}

const DECK_SCRIPT_PATH = path.join(CREATE_DECK_DIR, 'create_deck.py');

function runDeckBridge(workspaceDir: string): Promise<string> {
  const python = findPython();
  return new Promise((resolve, reject) => {
    const proc = spawn(python, [DECK_SCRIPT_PATH, workspaceDir], { cwd: workspaceDir });
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    proc.stdout.on('data', (chunk) => stdoutChunks.push(chunk.toString()));
    proc.stderr.on('data', (chunk) => stderrChunks.push(chunk.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        const stderr = stderrChunks.join('');
        return reject(new Error(`Deck builder exited with code ${code}: ${stderr}`));
      }
      const output = stdoutChunks.join('').trim();
      const lastLine = output.split('\n').pop() ?? '';
      if (!lastLine.endsWith('.apkg')) {
        return reject(
          new Error(`Deck builder did not return a valid .apkg path. stdout: ${output || '(empty)'}`)
        );
      }
      resolve(lastLine);
    });
  });
}

function makeForbiddenError(): Error & { status: number } {
  const err = new Error('Ankify access required') as Error & { status: number };
  err.status = 403;
  return err;
}

function makePayloadTooLargeError(): Error & { status: number } {
  const err = new Error(
    'Photo is too large — try a smaller or lower-resolution image'
  ) as Error & { status: number };
  err.status = 413;
  return err;
}

function makeFreeQuotaReachedError(used: number, limit: number): Error & {
  status: number;
  used: number;
  limit: number;
} {
  const err = new Error(
    `Free plan is ${limit} photos per month. You've used ${used}. Upgrade for unlimited.`
  ) as Error & { status: number; used: number; limit: number };
  err.status = 429;
  err.used = used;
  err.limit = limit;
  return err;
}

interface CompactCard {
  q: string;
  a: string;
  tags?: string[];
  cloze?: boolean;
}

interface CompactDeck {
  deck: string;
  cards: CompactCard[];
}

function parseClaudeVisionResponse(raw: string): CompactDeck[] {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const jsonEnd = cleaned.lastIndexOf(']');
  const toParse = jsonEnd >= 0 ? cleaned.slice(0, jsonEnd + 1) : cleaned;
  const parsed = JSON.parse(toParse) as unknown;
  if (!Array.isArray(parsed)) throw new Error('Claude Vision returned unexpected JSON structure');
  return parsed as CompactDeck[];
}

function buildDeckInfo(
  deckName: string,
  decks: CompactDeck[]
): Record<string, unknown> {
  const allCards = decks.flatMap((d) =>
    d.cards.map((c, i) => ({
      name: c.q,
      back: c.a,
      tags: c.tags ?? [],
      cloze: c.cloze ?? false,
      number: i,
      enableInput: false,
      answer: '',
      media: [],
    }))
  );

  return {
    deck: deckName,
    id: Math.abs(
      Array.from(deckName).reduce(
        (h, ch) => Math.trunc(Math.imul(31, h) + (ch.codePointAt(0) ?? 0)),
        0
      )
    ),
    cards: allCards,
    style: null,
    settings: {
      template: 'specialstyle',
      clozeModelName: 'n2a-cloze',
      basicModelName: 'n2a-basic',
      inputModelName: 'n2a-input',
      useNotionId: false,
    },
  };
}

export class PhotoToFlashcardsUseCase {
  constructor(private readonly events?: IEventsRepository) {}

  async execute(input: PhotoToFlashcardsInput): Promise<PhotoToFlashcardsResult> {
    const userId = ownerToUserId(input.owner);

    if (!input.isPaying && this.events != null) {
      const used = await this.events.countByNameForUser(
        VISION_PHOTO_EVENT,
        startOfMonth(),
        userId,
        userId == null ? input.owner : null
      );
      if (used >= FREE_PHOTO_QUOTA_PER_MONTH) {
        throw makeFreeQuotaReachedError(used, FREE_PHOTO_QUOTA_PER_MONTH);
      }
    }

    const { tokens, tiles } = countVisionTokens({
      width: input.imageDimensions.width,
      height: input.imageDimensions.height,
      mediaType: input.mediaType,
    });

    const ceiling = input.tokenCeilingOverride ?? VISION_TOKEN_CEILING;

    if (tokens > ceiling) {
      throw makePayloadTooLargeError();
    }

    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: input.mediaType,
                data: input.imageBase64,
              },
            },
            {
              type: 'text',
              text: VISION_PROMPT,
            },
          ],
        },
      ],
    });

    const rawText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    const decks = parseClaudeVisionResponse(rawText);
    const cardCount = decks.reduce((sum, d) => sum + d.cards.length, 0);

    const inputTokens = response.usage?.input_tokens ?? tokens;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const estimatedCostUsd =
      (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION +
      (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;

    const deckName = input.deckName || (decks[0]?.deck ?? 'Photo deck');
    const deckInfo = buildDeckInfo(deckName, decks);

    const workspaceDir = path.join(os.tmpdir(), `vision-${randomUUID()}`);
    fs.mkdirSync(workspaceDir, { recursive: true });

    let apkgPath: string;
    try {
      fs.writeFileSync(
        path.join(workspaceDir, 'deck_info.json'),
        JSON.stringify([deckInfo]),
        'utf-8'
      );
      apkgPath = await runDeckBridge(workspaceDir);
    } catch (err) {
      fs.rmSync(workspaceDir, { recursive: true, force: true });
      throw err;
    }

    console.log(JSON.stringify({
      event: 'vision_call_success',
      estimated_cost_usd: estimatedCostUsd,
      tile_count: tiles,
      media_type: input.mediaType,
      card_count: cardCount,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    }));

    track(VISION_PHOTO_EVENT, {
      userId: ownerToUserId(input.owner),
      anonymousId: ownerToUserId(input.owner) == null ? input.owner : null,
      props: { card_count: cardCount, tile_count: tiles },
    });

    return { apkgPath, cardCount, estimatedCostUsd, tileCount: tiles };
  }
}
