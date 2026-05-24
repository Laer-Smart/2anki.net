import CardOption from '../../lib/parser/Settings';
import {
  ColumnMapping,
  inferColumnMapping,
} from '../../lib/notionDatabase/inferColumnMapping';
import NotionAPIWrapper from '../../services/NotionService/NotionAPIWrapper';

export const DATABASE_PREVIEW_ROW_CAP = 10;

export interface DatabasePreviewSampleRow {
  [columnName: string]: string;
}

export interface DatabasePreview {
  title: string;
  url: string | null;
  columns: string[];
  mapping: ColumnMapping;
  samples: DatabasePreviewSampleRow[];
  rowCount: number;
  totalRowCount: number;
}

interface PlainTextItem {
  plain_text?: string;
}

interface SelectOption {
  name?: string;
}

interface DateValue {
  start?: string;
  end?: string | null;
}

interface FormulaValue {
  type?: string;
  string?: string;
  number?: number | null;
  boolean?: boolean | null;
  date?: DateValue | null;
}

interface UserValue {
  name?: string;
}

interface FileValue {
  name?: string;
}

function joinPlainText(items: PlainTextItem[] | undefined): string {
  if (!Array.isArray(items)) return '';
  return items
    .map((t) => t.plain_text ?? '')
    .filter((t) => t.length > 0)
    .join(' ');
}

function extractCellText(property: unknown): string {
  if (property == null || typeof property !== 'object') return '';
  const p = property as {
    type?: string;
    title?: PlainTextItem[];
    rich_text?: PlainTextItem[];
    number?: number | null;
    select?: SelectOption | null;
    multi_select?: SelectOption[];
    status?: SelectOption | null;
    checkbox?: boolean;
    url?: string | null;
    email?: string | null;
    phone_number?: string | null;
    date?: DateValue | null;
    created_time?: string;
    last_edited_time?: string;
    people?: UserValue[];
    files?: FileValue[];
    formula?: FormulaValue;
  };

  switch (p.type) {
    case 'title':
      return joinPlainText(p.title);
    case 'rich_text':
      return joinPlainText(p.rich_text);
    case 'number':
      return typeof p.number === 'number' ? String(p.number) : '';
    case 'select':
      return p.select?.name ?? '';
    case 'multi_select':
      return (p.multi_select ?? []).map((s) => s.name ?? '').filter((s) => s.length > 0).join(', ');
    case 'status':
      return p.status?.name ?? '';
    case 'checkbox':
      return p.checkbox ? '✓' : '';
    case 'url':
      return p.url ?? '';
    case 'email':
      return p.email ?? '';
    case 'phone_number':
      return p.phone_number ?? '';
    case 'date':
      return p.date?.start ?? '';
    case 'created_time':
      return p.created_time ?? '';
    case 'last_edited_time':
      return p.last_edited_time ?? '';
    case 'people':
      return (p.people ?? []).map((u) => u.name ?? '').filter((s) => s.length > 0).join(', ');
    case 'files':
      return (p.files ?? []).map((f) => f.name ?? '').filter((s) => s.length > 0).join(', ');
    case 'formula': {
      const f = p.formula;
      if (!f) return '';
      if (f.type === 'string') return f.string ?? '';
      if (f.type === 'number') return typeof f.number === 'number' ? String(f.number) : '';
      if (f.type === 'boolean') return f.boolean ? '✓' : '';
      if (f.type === 'date') return f.date?.start ?? '';
      return '';
    }
    default:
      return '';
  }
}

function columnNamesFrom(row: { properties?: Record<string, unknown> } | undefined): string[] {
  if (!row?.properties) return [];
  return Object.keys(row.properties);
}

type PreviewCapable = Pick<NotionAPIWrapper, 'getDatabase' | 'getDatabaseTitle' | 'queryDatabasePreview'>;

const PREVIEW_TITLE_SETTINGS = { pageEmoji: 'first_emoji' } as unknown as CardOption;

export class GetDatabasePreviewUseCase {
  constructor(private readonly api: PreviewCapable) {}

  async execute(databaseId: string, _owner: string): Promise<DatabasePreview> {
    const [database, queryResult] = await Promise.all([
      this.api.getDatabase(databaseId),
      this.api.queryDatabasePreview(databaseId, DATABASE_PREVIEW_ROW_CAP),
    ]);

    const title = await this.api.getDatabaseTitle(database, PREVIEW_TITLE_SETTINGS);
    const url = (database as { url?: string | null })?.url ?? null;

    const rows = queryResult.results as Array<{ properties?: Record<string, unknown> }>;
    const columns = columnNamesFrom(rows[0]);

    if (rows.length === 0 || columns.length === 0) {
      return {
        title,
        url,
        columns: [],
        mapping: { frontField: null, backField: null, ambiguous: true },
        samples: [],
        rowCount: 0,
        totalRowCount: queryResult.totalRowCount,
      };
    }

    const mapping = inferColumnMapping(columns);
    const samples = rows.slice(0, DATABASE_PREVIEW_ROW_CAP).map((row) => {
      const cells: DatabasePreviewSampleRow = {};
      for (const column of columns) {
        cells[column] = extractCellText(row.properties?.[column]);
      }
      return cells;
    });

    const rowCount = samples.length;
    const totalRowCount = Math.max(rowCount, queryResult.totalRowCount);

    return {
      title,
      url,
      columns,
      mapping,
      samples,
      rowCount,
      totalRowCount,
    };
  }
}
