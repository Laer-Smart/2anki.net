import { Client as NotionClient } from '@notionhq/client';

import { NotionObjectType } from '../../entities/ankify';
import { isNotionDatabaseNotPageError } from '../NotionService/helpers/isNotionDatabaseNotPageError';

export interface NotionPageMeta {
  title: string | null;
  url: string | null;
  icon: string | null;
  objectType?: NotionObjectType | null;
}

type NotionPageIconBlock =
  | { type: 'emoji'; emoji: string }
  | { type: 'external'; external: { url: string } }
  | { type: 'file'; file: { url: string } }
  | null
  | undefined;

interface NotionMetaClient {
  pages: {
    retrieve: (args: { page_id: string }) => Promise<unknown>;
  };
  databases: {
    retrieve: (args: { database_id: string }) => Promise<unknown>;
  };
}

const extractNotionPageTitle = (
  props: Record<string, unknown>
): string | null => {
  for (const value of Object.values(props)) {
    const entry = value as {
      type?: string;
      title?: { plain_text?: string }[];
    };
    if (entry.type === 'title' && Array.isArray(entry.title)) {
      const title = entry.title
        .map((t) => t.plain_text ?? '')
        .join('')
        .trim();
      return title.length === 0 ? null : title;
    }
  }
  return null;
};

const extractNotionDatabaseTitle = (
  title: { plain_text?: string }[] | undefined
): string | null => {
  if (!Array.isArray(title)) {
    return null;
  }
  const joined = title
    .map((t) => t.plain_text ?? '')
    .join('')
    .trim();
  return joined.length === 0 ? null : joined;
};

const extractNotionPageIcon = (icon: NotionPageIconBlock): string | null => {
  if (icon == null) return null;
  switch (icon.type) {
    case 'emoji':
      return icon.emoji;
    case 'external':
      return icon.external.url;
    case 'file':
      return icon.file.url;
    default:
      return null;
  }
};

const fetchDatabaseMeta = async (
  client: NotionMetaClient,
  databaseId: string
): Promise<NotionPageMeta> => {
  const database = await client.databases.retrieve({
    database_id: databaseId,
  });
  const title = extractNotionDatabaseTitle(
    (database as { title?: { plain_text?: string }[] }).title
  );
  const url = (database as { url?: string }).url ?? null;
  const icon = extractNotionPageIcon(
    (database as { icon?: NotionPageIconBlock }).icon
  );
  return { title, url, icon, objectType: 'database' };
};

const fetchPageMeta = async (
  client: NotionMetaClient,
  notionPageId: string
): Promise<NotionPageMeta> => {
  const page = await client.pages.retrieve({ page_id: notionPageId });
  const props =
    (page as { properties?: Record<string, unknown> }).properties ?? {};
  const title = extractNotionPageTitle(props);
  const url = (page as { url?: string }).url ?? null;
  const icon = extractNotionPageIcon(
    (page as { icon?: NotionPageIconBlock }).icon
  );
  return { title, url, icon, objectType: 'page' };
};

export const buildNotionPageMetaFetcher =
  (
    token: string,
    clientFactory: (auth: string) => NotionMetaClient = (auth) =>
      new NotionClient({ auth }) as unknown as NotionMetaClient
  ) =>
  async (
    notionPageId: string,
    knownObjectType?: NotionObjectType | null
  ): Promise<NotionPageMeta> => {
    const notion = clientFactory(token);
    if (knownObjectType === 'database') {
      return fetchDatabaseMeta(notion, notionPageId);
    }
    try {
      return await fetchPageMeta(notion, notionPageId);
    } catch (error) {
      if (isNotionDatabaseNotPageError(error)) {
        return fetchDatabaseMeta(notion, notionPageId);
      }
      throw error;
    }
  };
