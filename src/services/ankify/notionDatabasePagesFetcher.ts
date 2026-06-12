import { Client as NotionClient } from '@notionhq/client';
import { NotionDatabasePageRef } from './notionPageWalker';

export type NotionDatabasePagesFetcherFactory = (
  token: string
) => (databaseId: string) => Promise<NotionDatabasePageRef[]>;

interface TitlePropertyValue {
  type?: string;
  title?: { plain_text?: string }[];
}

const extractRowTitle = (row: Record<string, unknown>): string | null => {
  const properties = row.properties;
  if (properties == null || typeof properties !== 'object') {
    return null;
  }
  for (const value of Object.values(properties as Record<string, unknown>)) {
    const property = value as TitlePropertyValue;
    if (property?.type !== 'title' || !Array.isArray(property.title)) {
      continue;
    }
    const text = property.title
      .map((item) => item.plain_text ?? '')
      .join('')
      .trim();
    return text.length > 0 ? text : null;
  }
  return null;
};

export const notionDatabasePagesFetcherFactory: NotionDatabasePagesFetcherFactory =
  (token: string) => {
    const notion = new NotionClient({ auth: token });

    const findFirstDataSourceId = async (
      databaseId: string
    ): Promise<string | null> => {
      const dbResp = await notion.databases.retrieve({
        database_id: databaseId,
      });
      const dataSources =
        'data_sources' in dbResp
          ? (dbResp as { data_sources: { id: string }[] }).data_sources
          : [];
      return dataSources[0]?.id ?? null;
    };

    return async (databaseId: string): Promise<NotionDatabasePageRef[]> => {
      const dataSourceId = await findFirstDataSourceId(databaseId);
      if (dataSourceId == null) {
        return [];
      }
      const aggregated: NotionDatabasePageRef[] = [];
      let cursor: string | undefined;
      do {
        const response = await notion.dataSources.query({
          data_source_id: dataSourceId,
          page_size: 100,
          sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
          ...(cursor == null ? {} : { start_cursor: cursor }),
        });
        for (const row of response.results) {
          const id = (row as { id?: unknown }).id;
          if (typeof id === 'string') {
            aggregated.push({
              id,
              title: extractRowTitle(row as Record<string, unknown>),
            });
          }
        }
        cursor = response.next_cursor ?? undefined;
      } while (cursor != null);
      return aggregated;
    };
  };
