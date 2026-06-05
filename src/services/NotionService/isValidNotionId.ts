// Notion accepts both dashed and undashed 32-hex UUIDs as resource
// identifiers. Anything else is a client mistake (often a page title
// leaked into the id slot) and should be rejected without burning a
// Notion API call.

const DASHED =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNDASHED = /^[0-9a-f]{32}$/i;

export function isValidNotionId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  return DASHED.test(id) || UNDASHED.test(id);
}
