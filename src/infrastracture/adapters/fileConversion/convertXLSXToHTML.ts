import * as XLSX from 'xlsx';

type XLSXRow = [string | undefined, string | undefined, ...unknown[]];

const HEADER_CELL_MAX_LENGTH = 40;

function cellLooksLikeHeader(cell: unknown): boolean {
  if (cell == null) return true;
  if (typeof cell === 'string') {
    const trimmed = cell.trim();
    if (trimmed.length === 0) return true;
    if (trimmed.length > HEADER_CELL_MAX_LENGTH) return false;
    return Number.isNaN(Number(trimmed));
  }
  return false;
}

export function looksLikeHeaderRow(row: XLSXRow): boolean {
  const cells = row.filter(
    (cell) => cell != null && String(cell).trim() !== ''
  );
  if (cells.length === 0) return false;
  return cells.every(cellLooksLikeHeader);
}

export function convertXLSXToHTML(buffer: Buffer, title: string): string {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
  }) as XLSXRow[];

  const rows =
    jsonData.length > 0 && looksLikeHeaderRow(jsonData[0])
      ? jsonData.slice(1)
      : jsonData;

  return `<!DOCTYPE html>
<html>
<head><title>${title}</title></head>
<body>
  ${rows
    .map((row: XLSXRow) => {
      const front = row[0] || '';
      const back = row[1] || '';
      return `<ul class="toggle">
    <li>
      <details>
        <summary>${front}</summary>
        <p>${back}</p>
      </details>
    </li>
    </ul>`;
    })
    .join('\n')}
</body>
</html>`;
}
