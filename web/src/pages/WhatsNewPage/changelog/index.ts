export type ChangelogType = 'feature' | 'fix' | 'style';

export interface ChangelogEntry {
  id: string;
  date: string;
  type: ChangelogType;
  title: string;
}

const VALID_TYPES: ReadonlySet<ChangelogType> = new Set<ChangelogType>([
  'feature',
  'fix',
  'style',
]);

function parseEntry(raw: unknown): ChangelogEntry {
  if (raw == null || typeof raw !== 'object') {
    throw new Error('Changelog entry is not an object');
  }
  const obj = raw as Record<string, unknown>;
  const { id, date, type, title } = obj;
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error(`Changelog entry has invalid id: ${JSON.stringify(raw)}`);
  }
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Changelog entry ${id} has invalid date`);
  }
  if (typeof type !== 'string' || !VALID_TYPES.has(type as ChangelogType)) {
    throw new Error(`Changelog entry ${id} has invalid type: ${String(type)}`);
  }
  if (typeof title !== 'string' || title.length === 0) {
    throw new Error(`Changelog entry ${id} has invalid title`);
  }
  return { id, date, type: type as ChangelogType, title };
}

type JsonModule = { default: unknown };

function loadChangelog(): ChangelogEntry[] {
  const modules = import.meta.glob<JsonModule>('./*.json', { eager: true });
  const entries = Object.values(modules).map((m) => parseEntry(m.default));
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.id)) {
      throw new Error(`Duplicate changelog id: ${entry.id}`);
    }
    seen.add(entry.id);
  }
  return entries.sort((a, b) => b.id.localeCompare(a.id));
}

export const changelog: ChangelogEntry[] = loadChangelog();
