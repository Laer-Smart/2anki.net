import { renderNotionBlocks } from '../renderBlocks';
import { NotionBlockChildrenFetcher, NotionRenderableBlock } from '../types';

/**
 * Approval (golden) test for the Notion block renderer.
 *
 * The unit tests next door each render ONE block type in isolation with an
 * exact `toBe`. They are precise but blind to interaction: list grouping that
 * flushes around an intervening media block, output ordering across a mixed
 * page, and the media[] array accumulating refs from several blocks at once.
 * A regression in any of those leaves every isolated unit test green.
 *
 * This locks the WHOLE rendered shape of one representative page — a "kitchen
 * sink" that exercises text, color wrapping, both list kinds, to-do, quote,
 * code, equation, divider, a callout with nested children, a nested toggle,
 * and image / audio / video media — and verifies the produced {html, media}
 * in a single comparison. One verify replaces the dozens of assertions this
 * mixed tree would otherwise need (Bache, Approval Testing).
 *
 * Output is deterministic: media filenames derive from block.id, and there is
 * no time or randomness in the renderer, so no mocking is required.
 *
 * Regenerate intentionally after a real renderer change:
 *   pnpm test -- src/lib/notion-render/golden/renderBlocksGolden.test.ts -u
 * Review the snapshot diff like code — an unexpected change is a regression.
 */

const para = (text: string): NotionRenderableBlock => ({
  type: 'paragraph',
  paragraph: { rich_text: [{ plain_text: text }] },
});

const fetcherFor = (
  byParent: Record<string, NotionRenderableBlock[]>
): NotionBlockChildrenFetcher => {
  return async (id: string) => byParent[id] ?? [];
};

const kitchenSinkPage: NotionRenderableBlock[] = [
  {
    type: 'heading_1',
    heading_1: { rich_text: [{ plain_text: 'Cell biology' }] },
  },
  {
    type: 'paragraph',
    paragraph: {
      rich_text: [{ plain_text: 'A quick review.' }],
      color: 'red',
    },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ plain_text: 'Mitochondria' }] },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ plain_text: 'Ribosomes' }] },
  },
  {
    type: 'image',
    id: 'diagram1',
    image: { type: 'external', external: { url: 'https://x/cell.png' } },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ plain_text: 'Nucleus' }] },
  },
  {
    type: 'numbered_list_item',
    numbered_list_item: { rich_text: [{ plain_text: 'First' }] },
  },
  {
    type: 'numbered_list_item',
    numbered_list_item: { rich_text: [{ plain_text: 'Second' }] },
  },
  {
    type: 'to_do',
    to_do: {
      rich_text: [{ plain_text: 'Memorise the diagram' }],
      checked: false,
    },
  },
  {
    type: 'quote',
    quote: { rich_text: [{ plain_text: 'The cell is the unit of life.' }] },
  },
  {
    type: 'code',
    code: {
      rich_text: [{ plain_text: 'const atp = synthesise();' }],
      language: 'javascript',
    },
  },
  { type: 'equation', equation: { expression: 'E = mc^2' } },
  { type: 'divider', divider: {} },
  {
    type: 'callout',
    id: 'callout1',
    has_children: true,
    callout: {
      rich_text: [{ plain_text: 'Exam tip' }],
      icon: { type: 'emoji', emoji: '💡' },
    },
  },
  {
    type: 'toggle',
    id: 'toggle1',
    has_children: true,
    toggle: { rich_text: [{ plain_text: 'Reveal answer' }] },
  },
  {
    type: 'audio',
    id: 'audio1',
    audio: { type: 'external', external: { url: 'https://x/pronounce.mp3' } },
  },
  {
    type: 'video',
    id: 'video1',
    video: {
      type: 'external',
      external: { url: 'https://youtu.be/dQw4w9WgXcQ' },
    },
  },
  {
    type: 'bookmark',
    id: 'bm1',
    bookmark: { url: 'https://example.com/source' },
  },
];

const childrenByParent = {
  callout1: [para('Cells were first observed by Hooke.')],
  toggle1: [para('ATP is the energy currency.')],
};

it('produces a stable rendered page for a mixed Notion block tree', async () => {
  const out = await renderNotionBlocks(
    kitchenSinkPage,
    fetcherFor(childrenByParent)
  );
  expect(out).toMatchSnapshot();
});
