import type Anthropic from '@anthropic-ai/sdk';
import type { Message } from '@anthropic-ai/sdk/resources/messages';
import { jsonrepair } from 'jsonrepair';

import { getAnthropicClient } from '../../lib/claude/ClaudeService';
import { applyTransformedFields, TransformResultPayload } from '../../lib/ankify/transforms/applyTransformedFields';
import { buildTransformPrompt } from '../../lib/ankify/transforms/prompts';
import {
  FieldSelection,
  ParsedNote,
  TargetLanguage,
  TransformedNote,
  TransformName,
} from '../../lib/ankify/transforms/types';

const TRANSFORM_MODEL = 'claude-sonnet-4-5';
const TRANSFORM_MAX_TOKENS = 512;
const TRANSFORM_COST_PER_M_INPUT_USD = 3;
const TRANSFORM_COST_PER_M_OUTPUT_USD = 15;
const DEFAULT_CONCURRENCY = 5;

export interface TransformApkgInput {
  notes: ParsedNote[];
  transform: TransformName;
  targetLanguage?: TargetLanguage;
  selection?: FieldSelection;
  concurrency?: number;
  client?: Anthropic;
}

export interface TransformMediaFile {
  filename: string;
  bytes: Buffer;
}

export interface TransformApkgOutput {
  notes: TransformedNote[];
  failures: Array<{ guid: string; reason: string }>;
  media?: TransformMediaFile[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    totalCalls: number;
    elapsedMs: number;
  };
}

async function mapWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  const size = concurrency > 0 ? concurrency : 1;
  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    await Promise.all(slice.map((item, j) => worker(item, i + j)));
  }
}

function extractText(response: Message): string {
  const blocks = response.content as Array<{ type: string; text?: string }>;
  return blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('');
}

function parseJsonPayload(raw: string): TransformResultPayload {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned) as TransformResultPayload;
  } catch {
    return JSON.parse(jsonrepair(cleaned)) as TransformResultPayload;
  }
}

async function runTransformCall(
  client: Anthropic,
  note: ParsedNote,
  transform: TransformName,
  targetLanguage: TargetLanguage | undefined,
  selection: FieldSelection
): Promise<{ note: TransformedNote; inputTokens: number; outputTokens: number }> {
  const { system, user } = buildTransformPrompt(transform, note, targetLanguage, selection);
  const response = await client.messages.create({
    model: TRANSFORM_MODEL,
    max_tokens: TRANSFORM_MAX_TOKENS,
    system,
    messages: [{ role: 'user', content: user }],
  });
  const payload = parseJsonPayload(extractText(response));
  const transformed = applyTransformedFields(note, transform, payload, selection);
  return {
    note: transformed,
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
  };
}

export async function transformApkgNotes(
  input: TransformApkgInput
): Promise<TransformApkgOutput> {
  const client = input.client ?? getAnthropicClient();
  const concurrency = input.concurrency ?? DEFAULT_CONCURRENCY;
  const selection = input.selection ?? {};
  const t0 = Date.now();

  const results: Array<TransformedNote | null> = new Array(input.notes.length).fill(null);
  const failures: Array<{ guid: string; reason: string }> = [];
  let inputTokens = 0;
  let outputTokens = 0;

  await mapWithConcurrency(input.notes, concurrency, async (note, index) => {
    try {
      const { note: transformed, inputTokens: it, outputTokens: ot } = await runTransformCall(
        client,
        note,
        input.transform,
        input.targetLanguage,
        selection
      );
      results[index] = transformed;
      inputTokens += it;
      outputTokens += ot;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      failures.push({ guid: note.guid, reason });
    }
  });

  const elapsedMs = Date.now() - t0;
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * TRANSFORM_COST_PER_M_INPUT_USD +
    (outputTokens / 1_000_000) * TRANSFORM_COST_PER_M_OUTPUT_USD;
  const succeeded = results.filter((n): n is TransformedNote => n != null);

  console.info('[transform] job complete', {
    transform: input.transform,
    notesIn: input.notes.length,
    notesOut: succeeded.length,
    failures: failures.length,
    inputTokens,
    outputTokens,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(4)),
    elapsedMs,
    concurrency,
  });

  return {
    notes: succeeded,
    failures,
    usage: {
      inputTokens,
      outputTokens,
      estimatedCostUsd,
      totalCalls: input.notes.length,
      elapsedMs,
    },
  };
}
