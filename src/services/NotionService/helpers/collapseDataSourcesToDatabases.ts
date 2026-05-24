import type { SearchResponse } from '@notionhq/client/build/src/api-endpoints';

interface DataSourceLike {
  object: 'data_source';
  id: string;
  title?: unknown;
  icon?: unknown;
  parent?: { type?: string; database_id?: string };
  url?: string;
}

function isDataSource(value: unknown): value is DataSourceLike {
  return (
    value != null &&
    typeof value === 'object' &&
    (value as { object?: unknown }).object === 'data_source'
  );
}

export function collapseDataSourcesToDatabases(
  response: SearchResponse
): SearchResponse {
  const seenDatabaseIds = new Set<string>();
  for (const result of response.results) {
    if (
      result != null &&
      typeof result === 'object' &&
      (result as { object?: unknown }).object === 'database'
    ) {
      seenDatabaseIds.add((result as { id: string }).id);
    }
  }

  const collapsed: SearchResponse['results'] = [];
  for (const result of response.results) {
    if (!isDataSource(result)) {
      collapsed.push(result);
      continue;
    }
    const databaseId = result.parent?.database_id;
    if (databaseId == null || seenDatabaseIds.has(databaseId)) {
      continue;
    }
    seenDatabaseIds.add(databaseId);
    const rewritten = {
      ...result,
      object: 'database',
      id: databaseId,
    } as unknown as SearchResponse['results'][number];
    collapsed.push(rewritten);
  }

  return { ...response, results: collapsed };
}
