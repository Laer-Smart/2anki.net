import {
  ListBlockChildrenResponse,
  RichTextItemResponse,
  TableBlockObjectResponse,
  TableRowBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import CustomExporter from '../../../../lib/parser/exporters/CustomExporter';
import CardOption from '../../../../lib/parser/Settings/CardOption';
import Workspace from '../../../../lib/parser/WorkSpace';
import { setupTests } from '../../../../test/configure-jest';
import MockNotionAPI from '../../_mock/MockNotionAPI';
import BlockHandler from '../../BlockHandler/BlockHandler';
import { BlockTable, tableRowsToCards } from './BlockTable';

const api = new MockNotionAPI('', '');

beforeEach(() => setupTests());

function makeSettings(): CardOption {
  return new CardOption({});
}

function makeHandler(): BlockHandler {
  const exporter = new CustomExporter('', new Workspace(true, 'fs').location);
  return new BlockHandler(exporter, api, makeSettings());
}

function textRun(content: string): RichTextItemResponse {
  return {
    type: 'text',
    text: { content, link: null },
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: 'default',
    },
    plain_text: content,
    href: null,
  };
}

function codeRun(content: string): RichTextItemResponse {
  return {
    type: 'text',
    text: { content, link: null },
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: true,
      color: 'default',
    },
    plain_text: content,
    href: null,
  };
}

function tableRow(
  id: string,
  cells: RichTextItemResponse[][]
): TableRowBlockObjectResponse {
  return {
    object: 'block',
    id,
    type: 'table_row',
    table_row: { cells },
    parent: { type: 'block_id', block_id: 'parent-table-id' },
    created_time: '2024-01-01T00:00:00.000Z',
    last_edited_time: '2024-01-01T00:00:00.000Z',
    created_by: { object: 'user', id: 'user-1' },
    last_edited_by: { object: 'user', id: 'user-1' },
    has_children: false,
    archived: false,
    in_trash: false,
  };
}

function tableBlock(
  id: string,
  tableWidth: number,
  hasColumnHeader: boolean
): TableBlockObjectResponse {
  return {
    object: 'block',
    id,
    type: 'table',
    table: {
      table_width: tableWidth,
      has_column_header: hasColumnHeader,
      has_row_header: false,
    },
    parent: { type: 'page_id', page_id: 'page-1' },
    created_time: '2024-01-01T00:00:00.000Z',
    last_edited_time: '2024-01-01T00:00:00.000Z',
    created_by: { object: 'user', id: 'user-1' },
    last_edited_by: { object: 'user', id: 'user-1' },
    has_children: true,
    archived: false,
    in_trash: false,
  };
}

function childrenResponse(
  rows: TableRowBlockObjectResponse[]
): ListBlockChildrenResponse {
  return {
    object: 'list',
    results: rows,
    next_cursor: null,
    has_more: false,
    type: 'block',
    block: {},
  };
}

describe('tableRowsToCards', () => {
  it('returns one card per row for a 2-col table', () => {
    const block = tableBlock('t1', 2, false);
    const rows = [
      tableRow('r1', [[textRun('hello')], [textRun('world')]]),
      tableRow('r2', [[textRun('goodbye')], [textRun('moon')]]),
    ];
    const handler = makeHandler();
    const cards = tableRowsToCards(block, childrenResponse(rows), handler);
    expect(cards).toHaveLength(2);
    expect(cards[0].front).toContain('hello');
    expect(cards[0].back).toContain('world');
    expect(cards[1].front).toContain('goodbye');
    expect(cards[1].back).toContain('moon');
  });

  it('returns empty array for a 1-col table', () => {
    const block = tableBlock('t2', 1, false);
    const rows = [tableRow('r1', [[textRun('only one col')]])];
    const handler = makeHandler();
    const cards = tableRowsToCards(block, childrenResponse(rows), handler);
    expect(cards).toHaveLength(0);
  });

  it('skips the first row when has_column_header is true', () => {
    const block = tableBlock('t3', 2, true);
    const rows = [
      tableRow('r1', [[textRun('English')], [textRun('Japanese')]]),
      tableRow('r2', [[textRun('hello')], [textRun('konnichiwa')]]),
    ];
    const handler = makeHandler();
    const cards = tableRowsToCards(block, childrenResponse(rows), handler);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toContain('hello');
    expect(cards[0].back).toContain('konnichiwa');
  });

  it('skips a row where col2 renders as empty', () => {
    const block = tableBlock('t4', 2, false);
    const rows = [
      tableRow('r1', [[textRun('front')], []]),
      tableRow('r2', [[textRun('valid')], [textRun('back')]]),
    ];
    const handler = makeHandler();
    const cards = tableRowsToCards(block, childrenResponse(rows), handler);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toContain('valid');
  });

  it('skips a row where col1 renders as empty', () => {
    const block = tableBlock('t5', 2, false);
    const rows = [
      tableRow('r1', [[], [textRun('back')]]),
      tableRow('r2', [[textRun('valid')], [textRun('back')]]),
    ];
    const handler = makeHandler();
    const cards = tableRowsToCards(block, childrenResponse(rows), handler);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toContain('valid');
  });

  it('puts col3..N as an inline sub-table in back for 3+ col rows', () => {
    const block = tableBlock('t6', 3, false);
    const rows = [
      tableRow('r1', [
        [textRun('front')],
        [textRun('back')],
        [textRun('extra')],
      ]),
    ];
    const handler = makeHandler();
    const cards = tableRowsToCards(block, childrenResponse(rows), handler);
    expect(cards).toHaveLength(1);
    expect(cards[0].back).toContain('back');
    expect(cards[0].back).toContain('<table');
    expect(cards[0].back).toContain('extra');
  });

  it('turns code-wrapped text in col1 into a cloze deletion', () => {
    const block = tableBlock('t7', 2, false);
    const rows = [
      tableRow('r1', [
        [textRun('The capital of France is '), codeRun('Paris')],
        [textRun('geography')],
      ]),
    ];
    const handler = makeHandler();
    const cards = tableRowsToCards(block, childrenResponse(rows), handler);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toContain('{{c1::Paris}}');
    expect(cards[0].front).not.toContain('<code>');
    expect(cards[0].back).toContain('geography');
    expect(cards[0].isCloze).toBe(true);
  });

  it('uses col2 as the cloze text and col1 as the back when only col2 has code', () => {
    const block = tableBlock('t8', 2, false);
    const rows = [
      tableRow('r1', [
        [textRun('France')],
        [textRun('The capital is '), codeRun('Paris')],
      ]),
    ];
    const handler = makeHandler();
    const cards = tableRowsToCards(block, childrenResponse(rows), handler);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toContain('{{c1::Paris}}');
    expect(cards[0].back).toContain('France');
    expect(cards[0].isCloze).toBe(true);
  });

  it('increments cloze numbers across multiple code spans in one cell', () => {
    const block = tableBlock('t9', 2, false);
    const rows = [
      tableRow('r1', [
        [textRun('Symbol: '), codeRun('H'), textRun(' Number: '), codeRun('1')],
        [textRun('chemistry')],
      ]),
    ];
    const handler = makeHandler();
    const cards = tableRowsToCards(block, childrenResponse(rows), handler);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toContain('{{c1::H}}');
    expect(cards[0].front).toContain('{{c2::1}}');
    expect(cards[0].isCloze).toBe(true);
  });

  it('leaves plain cells unchanged and not cloze-typed', () => {
    const block = tableBlock('t10', 2, false);
    const rows = [tableRow('r1', [[textRun('hello')], [textRun('world')]])];
    const handler = makeHandler();
    const cards = tableRowsToCards(block, childrenResponse(rows), handler);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toContain('hello');
    expect(cards[0].back).toContain('world');
    expect(cards[0].isCloze).toBe(false);
  });

  it('keeps code markup as-is when cloze is disabled in settings', () => {
    const block = tableBlock('t11', 2, false);
    const rows = [
      tableRow('r1', [
        [textRun('The capital is '), codeRun('Paris')],
        [textRun('geography')],
      ]),
    ];
    const exporter = new CustomExporter('', new Workspace(true, 'fs').location);
    const handler = new BlockHandler(
      exporter,
      api,
      new CardOption({ cloze: 'false' })
    );
    const cards = tableRowsToCards(block, childrenResponse(rows), handler);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toContain('<code>Paris</code>');
    expect(cards[0].front).not.toContain('{{c1::');
    expect(cards[0].isCloze).toBe(false);
  });
});

describe('BlockTable markup', () => {
  it('uses <th> for header row when has_column_header is true', async () => {
    const block = tableBlock('bt1', 2, true);
    const handler = makeHandler();
    const markup = await BlockTable(block, handler);
    expect(markup).toContain('<th');
  });

  it('uses <td> only when has_column_header is false', async () => {
    const block = tableBlock('bt2', 2, false);
    const handler = makeHandler();
    const markup = await BlockTable(block, handler);
    expect(markup).not.toContain('<th');
    expect(markup).toContain('<td');
  });

  it('returns a <table> wrapping all rows', async () => {
    const block = tableBlock('bt3', 2, false);
    const handler = makeHandler();
    const markup = await BlockTable(block, handler);
    expect(markup).toContain('<table');
    expect(markup).toContain('</table>');
  });
});
