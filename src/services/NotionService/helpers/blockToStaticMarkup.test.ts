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
