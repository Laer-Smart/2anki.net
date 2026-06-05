import {
  ListBlockChildrenResponse,
  RichTextItemResponse,
  TableBlockObjectResponse,
  TableRowBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import handleClozeDeletions from '../../../../lib/parser/helpers/handleClozeDeletions';
import hasInlineClozeCode from '../../../../lib/parser/helpers/hasInlineClozeCode';
import BlockHandler from '../../BlockHandler/BlockHandler';
import renderTextChildren from '../../helpers/renderTextChildren';

interface TableCard {
  front: string;
  back: string;
  isCloze: boolean;
}

function toClozeCard(front: string, back: string): TableCard {
  if (hasInlineClozeCode(front)) {
    return { front: handleClozeDeletions(front), back, isCloze: true };
  }
  if (hasInlineClozeCode(back)) {
    return { front: handleClozeDeletions(back), back: front, isCloze: true };
  }
  return { front, back, isCloze: false };
}

function renderCell(
  cell: RichTextItemResponse[],
  handler: BlockHandler
): string {
  return renderTextChildren(cell, handler.settings);
}

function buildExtraColumnsTable(
  extraCells: RichTextItemResponse[][],
  handler: BlockHandler
): string {
  const tds = extraCells
    .map((cell) => `<td>${renderCell(cell, handler)}</td>`)
    .join('');
  return `<table><tbody><tr>${tds}</tr></tbody></table>`;
}

export function tableRowsToCards(
  block: TableBlockObjectResponse,
  children: ListBlockChildrenResponse,
  handler: BlockHandler
): TableCard[] {
  const rows = children.results.filter(
    (r): r is TableRowBlockObjectResponse =>
      'type' in r && r.type === 'table_row'
  );

  if (block.table.table_width < 2) {
    console.debug('tableRowsToCards: skipping 1-column table', block.id);
    return [];
  }

  const dataRows = block.table.has_column_header ? rows.slice(1) : rows;

  let skippedCount = 0;
  const cards: TableCard[] = [];

  for (const row of dataRows) {
    const cells = row.table_row.cells;
    const front = renderCell(cells[0] ?? [], handler);
    const col2 = renderCell(cells[1] ?? [], handler);

    if (!front || !col2) {
      skippedCount++;
      continue;
    }

    const extraCells = cells.slice(2);
    const back =
      extraCells.length > 0
        ? col2 + buildExtraColumnsTable(extraCells, handler)
        : col2;

    if (handler.settings.isCloze) {
      cards.push(toClozeCard(front, back));
    } else {
      cards.push({ front, back, isCloze: false });
    }
  }

  if (skippedCount > 0) {
    console.debug(
      `tableRowsToCards: skipped ${skippedCount} row(s) with empty col1 or col2`,
      block.id
    );
  }

  return cards;
}

export async function BlockTable(
  block: TableBlockObjectResponse,
  handler: BlockHandler
): Promise<string> {
  const children = await handler.api.getBlocks({
    createdAt: block.created_time,
    lastEditedAt: block.last_edited_time,
    id: block.id,
    all: handler.useAll,
    type: block.type,
  });

  const rows = children.results.filter(
    (r): r is TableRowBlockObjectResponse =>
      'type' in r && r.type === 'table_row'
  );

  if (rows.length === 0) {
    return '';
  }

  const renderRow = (
    row: TableRowBlockObjectResponse,
    isHeader: boolean
  ): string => {
    const tag = isHeader ? 'th' : 'td';
    const cells = row.table_row.cells
      .map((cell) => `<${tag}>${renderCell(cell, handler)}</${tag}>`)
      .join('');
    return `<tr>${cells}</tr>`;
  };

  const [firstRow, ...remainingRows] = rows;
  let tbody = '';

  if (block.table.has_column_header) {
    const thead = `<thead>${renderRow(firstRow, true)}</thead>`;
    const bodyRows = remainingRows.map((r) => renderRow(r, false)).join('');
    tbody = `${thead}<tbody>${bodyRows}</tbody>`;
  } else {
    const allRows = rows.map((r) => renderRow(r, false)).join('');
    tbody = `<tbody>${allRows}</tbody>`;
  }

  return `<table>${tbody}</table>`;
}
