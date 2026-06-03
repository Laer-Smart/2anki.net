import { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import CustomExporter from '../../../lib/parser/exporters/CustomExporter';
import CardOption from '../../../lib/parser/Settings/CardOption';
import Workspace from '../../../lib/parser/WorkSpace';
import { setupTests } from '../../../test/configure-jest';
import MockNotionAPI from '../_mock/MockNotionAPI';
import BlockHandler from '../BlockHandler/BlockHandler';
import { blockToStaticMarkup } from './blockToStaticMarkup';

beforeEach(() => setupTests());

function makeHandler(): BlockHandler {
  const exporter = new CustomExporter(
    '',
    new Workspace(true, 'fs').location
  );
  return new BlockHandler(exporter, new MockNotionAPI('', ''), new CardOption({}));
}

describe('blockToStaticMarkup', () => {
  it('drops a stray table_row block instead of leaking unsupported JSON to the card', async () => {
    const handler = makeHandler();
    const tableRow = {
      object: 'block',
      id: '3677ab29-a11e-80d8-89f3-fb77c3ef0ed7',
      type: 'table_row',
      table_row: {
        cells: [
          [
            {
              type: 'text',
              text: { content: 'first', link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: 'default',
              },
              plain_text: 'first',
              href: null,
            },
          ],
        ],
      },
      parent: { type: 'block_id', block_id: 'parent-table-id' },
      created_time: '2026-05-21T07:46:00.000Z',
      last_edited_time: '2026-05-21T07:46:00.000Z',
      created_by: { object: 'user', id: 'user-1' },
      last_edited_by: { object: 'user', id: 'user-1' },
      has_children: false,
      archived: false,
      in_trash: false,
    } as unknown as BlockObjectResponse;

    const result = await blockToStaticMarkup(handler, tableRow);

    expect(result).toBe('');
    expect(result).not.toContain('unsupported');
    expect(result).not.toContain('table_row');
    expect(result).not.toContain('"object"');
  });

  it('renders a labelled placeholder for an empty synced_block instead of leaking unsupported JSON or nothing', async () => {
    const handler = makeHandler();
    const syncedBlock = {
      object: 'block',
      id: 'synced-1',
      type: 'synced_block',
      synced_block: { synced_from: null },
      parent: { type: 'page_id', page_id: 'page-1' },
      created_time: '2026-05-20T07:46:00.000Z',
      last_edited_time: '2026-05-20T07:46:00.000Z',
      created_by: { object: 'user', id: 'user-1' },
      last_edited_by: { object: 'user', id: 'user-1' },
      has_children: false,
      archived: false,
      in_trash: false,
    } as unknown as BlockObjectResponse;

    const result = await blockToStaticMarkup(handler, syncedBlock);

    expect(result).toContain('synced-block-empty');
    expect(result).toContain('Synced block');
    expect(result).not.toContain('unsupported');
    expect(result).not.toContain('"object"');
  });

  it('renders a pdf block as an embed with a fallback download link', async () => {
    const handler = makeHandler();
    const pdf = {
      object: 'block',
      id: 'pdf-1',
      type: 'pdf',
      pdf: {
        type: 'external',
        external: { url: 'https://example.com/notes.pdf' },
        caption: [],
      },
      parent: { type: 'page_id', page_id: 'page-1' },
      created_time: '2026-05-21T07:46:00.000Z',
      last_edited_time: '2026-05-21T07:46:00.000Z',
      created_by: { object: 'user', id: 'user-1' },
      last_edited_by: { object: 'user', id: 'user-1' },
      has_children: false,
      archived: false,
      in_trash: false,
    } as unknown as BlockObjectResponse;

    const result = await blockToStaticMarkup(handler, pdf);

    expect(result).toContain('<embed');
    expect(result).toContain('type="application/pdf"');
    expect(result).toContain('https://example.com/notes.pdf');
    expect(result).toContain('<a');
    expect(result).not.toContain('unsupported: pdf');
  });

  it('renders a link_preview block as a clickable link to the previewed url', async () => {
    const handler = makeHandler();
    const linkPreview = {
      object: 'block',
      id: 'link-preview-1',
      type: 'link_preview',
      link_preview: { url: 'https://github.com/2anki/server' },
      parent: { type: 'page_id', page_id: 'page-1' },
      created_time: '2026-05-21T07:46:00.000Z',
      last_edited_time: '2026-05-21T07:46:00.000Z',
      created_by: { object: 'user', id: 'user-1' },
      last_edited_by: { object: 'user', id: 'user-1' },
      has_children: false,
      archived: false,
      in_trash: false,
    } as unknown as BlockObjectResponse;

    const result = await blockToStaticMarkup(handler, linkPreview);

    expect(result).toContain('href="https://github.com/2anki/server"');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('https://github.com/2anki/server');
    expect(result).not.toContain('unsupported: link_preview');
  });

  it('renders a standalone equation block as display math', async () => {
    const handler = makeHandler();
    const equation = {
      object: 'block',
      id: 'equation-1',
      type: 'equation',
      equation: { expression: '\\sqrt{x}' },
      parent: { type: 'page_id', page_id: 'page-1' },
      created_time: '2026-05-21T07:46:00.000Z',
      last_edited_time: '2026-05-21T07:46:00.000Z',
      created_by: { object: 'user', id: 'user-1' },
      last_edited_by: { object: 'user', id: 'user-1' },
      has_children: false,
      archived: false,
      in_trash: false,
    } as unknown as BlockObjectResponse;

    const result = await blockToStaticMarkup(handler, equation);

    expect(result).toBe('\\[\\sqrt{x}\\]');
  });

  it('still emits the unsupported placeholder for genuinely unknown block types', async () => {
    const handler = makeHandler();
    const unknownBlock = {
      object: 'block',
      id: 'unknown-1',
      type: 'something_notion_added_later',
      parent: { type: 'page_id', page_id: 'page-1' },
      created_time: '2026-05-21T07:46:00.000Z',
      last_edited_time: '2026-05-21T07:46:00.000Z',
      created_by: { object: 'user', id: 'user-1' },
      last_edited_by: { object: 'user', id: 'user-1' },
      has_children: false,
      archived: false,
      in_trash: false,
    } as unknown as BlockObjectResponse;

    const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    const result = await blockToStaticMarkup(handler, unknownBlock);
    consoleDebugSpy.mockRestore();

    expect(result).toContain('unsupported: something_notion_added_later');
  });
});
