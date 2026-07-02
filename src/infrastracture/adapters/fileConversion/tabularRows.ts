import * as XLSX from 'xlsx';

export type TabularRow = unknown[];

const HEADER_CELL_MAX_LENGTH = 40;

const FIELD_HEADER_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['front', 'back'],
  ['question', 'answer'],
  ['term', 'definition'],
];

export interface FieldColumns {
  frontIndex: number;
  backIndex: number;
}

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

export function looksLikeHeaderRow(row: TabularRow): boolean {
  const cells = row.filter(
    (cell) => cell != null && String(cell).trim() !== ''
  );
  if (cells.length === 0) return false;
  return cells.every(cellLooksLikeHeader);
}

export function cellText(cell: unknown): string {
  return cell == null ? '' : String(cell);
}

export function rowsFromBuffer(buffer: Buffer): TabularRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 65001 });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
  }) as TabularRow[];
}

export function detectFieldColumns(row: TabularRow): FieldColumns | null {
  const normalized = row.map((cell) => cellText(cell).trim().toLowerCase());
  for (const [frontName, backName] of FIELD_HEADER_PAIRS) {
    const frontIndex = normalized.indexOf(frontName);
    const backIndex = normalized.indexOf(backName);
    if (frontIndex !== -1 && backIndex !== -1) {
      return { frontIndex, backIndex };
    }
  }
  return null;
}
