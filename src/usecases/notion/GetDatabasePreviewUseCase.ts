import CardOption from '../../lib/parser/Settings';
import {
  ColumnMapping,
  inferColumnMapping,
} from '../../lib/notionDatabase/inferColumnMapping';
import NotionAPIWrapper from '../../services/NotionService/NotionAPIWrapper';

export const DATABASE_PREVIEW_ROW_CAP = 10;

export interface DatabasePreviewSample {
  id: string;
  values: Record<string, string>;
}

export interface DatabasePreview {
  title: string;
  url: string | null;
  columns: string[];
  mapping: ColumnMapping;
  samples: DatabasePreviewSample[];
  rowCount: number;
  hasMore: boolean;
}

interface PlainTextItem {
  plain_text?: string;
}

function joinPlainText(items: PlainTextItem[] | undefined): string {
  if (!Array.isArray(items)) return '';
  return items
    .map((t) => t.plain_text ?? '')
    .filter((t) => t.length > 0)
    .join(' ');
}

function joinNamed(items: Array<{ name?: string }> | undefined): string {
  if (!Array.isArray(items)) return '';
  return items
    .map((s) => s.name ?? '')
    .filter((s) => s.length > 0)
    .join(', ');
}

function numberToString(n: number | null | undefined): string {
  return typeof n === 'number' ? String(n) : '';
}

function extractFormula(formula: unknown): string {
  if (formula == null || typeof formula !== 'object') return '';
  const f = formula as {
    type?: string;
    string?: string;
    number?: number | null;
    boolean?: boolean | null;
    date?: { start?: string } | null;
  };
  if (f.type === 'string') return f.string ?? '';
  if (f.type === 'number') return numberToString(f.number);
  if (f.type === 'boolean') return f.boolean ? '✓' : '';
  if (f.type === 'date') return f.date?.start ?? '';
  return '';
}

type Property = Record<string, unknown> & { type?: string };

const CELL_EXTRACTORS: Record<string, (p: Property) => string> = {
  title: (p) => joinPlainText(p.title as PlainTextItem[] | undefined),
  rich_text: (p) => joinPlainText(p.rich_text as PlainTextItem[] | undefined),
  number: (p) => numberToString(p.number as number | null | undefined),
  select: (p) => (p.select as { name?: string } | null)?.name ?? '',
  multi_select: (p) =>
    joinNamed(p.multi_select as Array<{ name?: string }> | undefined),
  status: (p) => (p.status as { name?: string } | null)?.name ?? '',
  checkbox: (p) => (p.checkbox ? '✓' : ''),
  url: (p) => (p.url as string | null) ?? '',
  email: (p) => (p.email as string | null) ?? '',
  phone_number: (p) => (p.phone_number as string | null) ?? '',
  date: (p) => (p.date as { start?: string } | null)?.start ?? '',
  created_time: (p) => (p.created_time as string | undefined) ?? '',
  last_edited_time: (p) => (p.last_edited_time as string | undefined) ?? '',
  people: (p) => joinNamed(p.people as Array<{ name?: string }> | undefined),
  files: (p) => joinNamed(p.files as Array<{ name?: string }> | undefined),
  formula: (p) => extractFormula(p.formula),
};

function extractCellText(property: unknown): string {
  if (property == null || typeof property !== 'object') return '';
  const p = property as Property;
  const extractor = p.type ? CELL_EXTRACTORS[p.type] : undefined;
  return extractor ? extractor(p) : '';
}

interface RawRow {
  id?: string;
  properties?: Record<string, unknown>;
}

function columnNamesFrom(row: RawRow | undefined): string[] {
  if (!row?.properties) return [];
  return Object.keys(row.properties);
}

type PreviewCapable = Pick<
  NotionAPIWrapper,
  'getDatabase' | 'getDatabaseTitle' | 'queryDatabasePreview'
>;

const PREVIEW_TITLE_SETTINGS = {
  pageEmoji: 'first_emoji',
} as unknown as CardOption;

export class GetDatabasePreviewUseCase {
  constructor(private readonly api: PreviewCapable) {}

  async execute(databaseId: string, _owner: string): Promise<DatabasePreview> {
    const [database, queryResult] = await Promise.all([
      this.api.getDatabase(databaseId),
      this.api.queryDatabasePreview(databaseId, DATABASE_PREVIEW_ROW_CAP),
    ]);

    const title = await this.api.getDatabaseTitle(
      database,
      PREVIEW_TITLE_SETTINGS
    );
    const url = (database as { url?: string | null })?.url ?? null;

    const rows = queryResult.results as RawRow[];
    const columns = columnNamesFrom(rows[0]);

    if (rows.length === 0 || columns.length === 0) {
      return {
        title,
        url,
        columns: [],
        mapping: { frontField: null, backField: null, ambiguous: true },
        samples: [],
        rowCount: 0,
        hasMore: false,
      };
    }

    const mapping = inferColumnMapping(columns);
    const samples: DatabasePreviewSample[] = rows
      .slice(0, DATABASE_PREVIEW_ROW_CAP)
      .map((row, idx) => {
        const values: Record<string, string> = {};
        for (const column of columns) {
          values[column] = extractCellText(row.properties?.[column]);
        }
        return { id: row.id ?? `row-${idx}`, values };
      });

    return {
      title,
      url,
      columns,
      mapping,
      samples,
      rowCount: samples.length,
      hasMore: queryResult.hasMore,
    };
  }
}
