import { Client as NotionClient } from '@notionhq/client';
import { NotionDatabasePageRef } from './notionPageWalker';

export type NotionDatabasePagesFetcherFactory = (
  token: string
) => (databaseId: string) => Promise<NotionDatabasePageRef[]>;

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
          ...(cursor == null ? {} : { start_cursor: cursor }),
        });
        for (const row of response.results) {
          const id = (row as { id?: unknown }).id;
          if (typeof id === 'string') {
            aggregated.push({ id });
          }
        }
        cursor = response.next_cursor ?? undefined;
      } while (cursor != null);
      return aggregated;
    };
  };
