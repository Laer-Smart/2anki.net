import { randomUUID } from 'node:crypto';
import { getAnthropicClient } from '../../lib/claude/ClaudeService';
import type { VisionMediaType } from '../../lib/claude/countVisionTokens';

export interface AutoOcclusionSuggestInput {
  imageBase64: string;
  mediaType: VisionMediaType;
  width: number;
  height: number;
}

export interface SuggestedRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  shape: 'rect';
  confidence: number;
  source: 'auto';
}

export interface AutoOcclusionSuggestResult {
  rects: SuggestedRect[];
  inputTokens: number;
  outputTokens: number;
}

const CONFIDENCE_THRESHOLD = 0.6;

const AUTO_OCCLUSION_PROMPT = `Analyze this image for visually emphasized terms that should become Anki flashcard occlusions.

Look for:
1. Terms with a highlighted background (yellow, green, blue, pink marker overlay)
2. Bold or heavy-weight text that stands out from surrounding body text

For each emphasized term or phrase, return its bounding box as a fraction of image dimensions (0.0 to 1.0).

Output ONLY a compact JSON object. Format (nothing else):
{"rects":[{"x":0.1,"y":0.05,"w":0.3,"h":0.08,"label":"term text","confidence":0.9}]}

Rules:
- x, y are the top-left corner (normalized 0–1)
- w, h are width and height (normalized 0–1)
- label is the exact text inside the emphasized region
- confidence is 0.0–1.0 (how certain you are this is an emphasized term)
- Only include terms with confidence >= 0.6
- If no emphasized terms are found, return: {"rects":[]}`;

interface RawRect {
  x?: unknown;
  y?: unknown;
  w?: unknown;
  h?: unknown;
  label?: unknown;
  confidence?: unknown;
}

interface RawResponse {
  rects?: unknown;
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function parseRects(raw: string): Array<RawRect & { confidence: number }> {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return [];
  }

  if (!parsed || typeof parsed !== 'object') return [];
  const response = parsed as RawResponse;
  if (!Array.isArray(response.rects)) return [];

  const result: Array<RawRect & { confidence: number }> = [];
  for (const item of response.rects) {
    if (!item || typeof item !== 'object') continue;
    const rect = item as RawRect;
    if (!isNumber(rect.x) || !isNumber(rect.y) || !isNumber(rect.w) || !isNumber(rect.h)) continue;
    const confidence = isNumber(rect.confidence) ? rect.confidence : 0;
    if (confidence < CONFIDENCE_THRESHOLD) continue;
    result.push({ ...rect, confidence });
  }
  return result;
}

export class AutoOcclusionService {
  async suggest(input: AutoOcclusionSuggestInput): Promise<AutoOcclusionSuggestResult> {
    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
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
              text: AUTO_OCCLUSION_PROMPT,
            },
          ],
        },
      ],
    });

    const rawText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;

    const parsedRects = parseRects(rawText);

    const rects: SuggestedRect[] = parsedRects.map((r) => ({
      id: randomUUID(),
      x: r.x as number,
      y: r.y as number,
      w: r.w as number,
      h: r.h as number,
      label: typeof r.label === 'string' ? r.label : '',
      shape: 'rect',
      confidence: r.confidence,
      source: 'auto',
    }));

    return { rects, inputTokens, outputTokens };
  }
}
