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

const CONFIDENCE_THRESHOLD = 0.5;

const AUTO_OCCLUSION_PROMPT = `Find text labels in this image that should become Anki flashcard occlusions. The reader will study by trying to recall each label after it is hidden.

Detect ALL of these label types:

1. **Diagram labels with leader lines or arrows.** A line connects the label text to a specific feature (anatomy diagrams, parts diagrams, scientific figures, maps, exploded views). Each label should become its own occlusion. Example: "Aorta" connected by a line to a blood vessel in a heart diagram.

2. **Callouts and annotations.** Text that names or points to a region of the image — typically near the edges, in a different style from the underlying art.

3. **Highlighted terms.** Text with a yellow / green / blue / pink marker overlay.

4. **Bold or emphasized terms.** Text that stands out by weight, color, or size from surrounding body text.

5. **Table headers, axis labels, and named regions** in charts or maps.

Do NOT occlude:
- Image titles or captions describing the whole image
- Body paragraphs of running text
- Watermarks, copyright lines, or logos
- The features themselves (anatomy parts, map regions) — occlude only the text labels that name them

For each label, return its bounding box around the TEXT itself (not the feature it points to). Use normalized coordinates 0.0–1.0 of the full image.

Output ONLY a compact JSON object. Format (nothing else):
{"rects":[{"x":0.1,"y":0.05,"w":0.3,"h":0.08,"label":"Aorta","confidence":0.95}]}

Rules:
- x, y are the top-left corner (normalized 0–1)
- w, h are width and height (normalized 0–1) — keep the box tight around the label text
- label is the exact text the user would need to recall (one term per rect)
- confidence is 0.0–1.0
- Only include rects with confidence >= 0.5
- If no labels are found, return: {"rects":[]}`;

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
      model: 'claude-sonnet-4-6',
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
