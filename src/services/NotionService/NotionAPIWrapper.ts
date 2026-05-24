import { Client, isFullBlock, isFullDatabase } from '@notionhq/client';
import {
  BlockObjectRequest,
  CreatePageResponse,
  GetBlockResponse,
  GetDatabaseResponse,
  GetPageResponse,
  ListBlockChildrenResponse,
  QueryDataSourceResponse,
  SearchResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { CreateFileUploadResponse } from '@notionhq/client/build/src/api-endpoints/file-uploads';
import { getNotionObjectTitle } from 'get-notion-object-title';

import sanitizeTags from '../../lib/anki/sanitizeTags';
import ParserRules from '../../lib/parser/ParserRules';
import CardOption from '../../lib/parser/Settings/CardOption';
import { getParagraphBlocks } from './helpers/getParagraphBlocks';
import renderIcon from './helpers/renderIcon';
import getBlockIcon, { WithIcon } from './blocks/getBlockIcon';
import { isHeading } from './helpers/isHeading';
import { getHeadingText } from './helpers/getHeadingText';
import { uniqueTimerLabel } from './helpers/uniqueTimerLabel';
import { withRetry } from './helpers/withRetry';
import { collapseDataSourcesToDatabases } from './helpers/collapseDataSourcesToDatabases';
import type { IBlocksCacheRepository } from '../../data_layer/BlocksCacheRepository';
import { isValidNotionId } from './isValidNotionId';
import { ValidNotionType } from './types';

const DEFAULT_PAGE_SIZE_LIMIT = 100 * 2;

export interface GetBlockParams {
  createdAt: string;
  lastEditedAt: string;
  id: string;
  type: ValidNotionType;
  all?: boolean;
}

class NotionAPIWrapper {
  private notion: Client;

  page?: GetPageResponse;

  private owner: string;

  private blocksCache?: IBlocksCacheRepository;

  constructor(
    key: string,
    owner: string,
    blocksCache?: IBlocksCacheRepository
  ) {
    this.notion = new Client({ auth: key });
    this.owner = owner;
    this.blocksCache = blocksCache;
  }

  getPage(id: string): Promise<GetPageResponse | null> {
    if (!isValidNotionId(id)) {
      console.info(
        '[notion] skipping pages.retrieve for non-UUID id:',
        JSON.stringify(id).slice(0, 80)
      );
      return Promise.resolve(null);
    }
    return withRetry(() => this.notion.pages.retrieve({ page_id: id }), {
      label: 'pages.retrieve',
    });
  }

  async getBlocks({
    createdAt,
    lastEditedAt,
    id,
    all,
    type,
  }: GetBlockParams): Promise<ListBlockChildrenResponse> {
    if (type === 'unsupported') {
      return {
        type: 'block',
        block: {},
        object: 'list',
        next_cursor: null,
        has_more: false,
        results: [],
      };
    }

    const getBlocksLabel = uniqueTimerLabel(`getBlocks:${id}${all}`);
    console.time(getBlocksLabel);

    const cachedPayload =
      all && this.blocksCache
        ? await this.blocksCache.get({
            id,
            owner: this.owner,
            lastEditedAt,
          })
        : null;
    if (cachedPayload) {
      console.log('using payload cache');
      console.timeEnd(getBlocksLabel);
      return cachedPayload;
    }
    const response = await withRetry(
      () =>
        this.notion.blocks.children.list({
          block_id: id,
          page_size: DEFAULT_PAGE_SIZE_LIMIT,
        }),
      { label: 'blocks.children.list' }
    );
    console.log('received', response.results.length, 'blocks');

    if (all && response.has_more && response.next_cursor) {
      while (true) {
        const { results, next_cursor: nextCursor }: ListBlockChildrenResponse =
          await withRetry(
            () =>
              this.notion.blocks.children.list({
                block_id: id,
                start_cursor: response.next_cursor!,
              }),
            { label: 'blocks.children.list:page' }
          );
        console.log('found more', results.length, 'blocks');
        response.results.push(...results);
        if (nextCursor) {
          response.next_cursor = nextCursor;
        } else {
          console.log('done getting blocks');
          break;
        }
      }
    }
    if (!createdAt || !lastEditedAt) {
      console.log('not enough input block cache');
    } else if (this.blocksCache) {
      await this.blocksCache.save({
        id,
        owner: this.owner,
        payload: response,
        createdAt,
        lastEditedAt,
      });
    }
    console.timeEnd(getBlocksLabel);
    return response;
  }

  getBlock(id: string): Promise<GetBlockResponse> {
    return withRetry(
      () => this.notion.blocks.retrieve({ block_id: id }),
      { label: 'blocks.retrieve' }
    );
  }

  /**
   * Cursor-paginated block fetch for streaming previews. Does NOT touch the
   * block cache (preview is a view-only concern, and we want fresh cursor
   * boundaries on each call) and does NOT auto-exhaust pagination.
   */
  listBlocksPage(
    id: string,
    options: { pageSize?: number; startCursor?: string } = {}
  ): Promise<ListBlockChildrenResponse> {
    return withRetry(
      () =>
        this.notion.blocks.children.list({
          block_id: id,
          page_size: options.pageSize ?? 15,
          ...(options.startCursor
            ? { start_cursor: options.startCursor }
            : {}),
        }),
      { label: 'blocks.children.list:preview' }
    );
  }

  deleteBlock(id: string): Promise<GetBlockResponse> {
    return this.notion.blocks.delete({
      block_id: id,
    });
  }

  createBlock(
    parent: string,
    newBlock: BlockObjectRequest
  ): Promise<ListBlockChildrenResponse> {
    return this.notion.blocks.children.append({
      block_id: parent,
      children: [newBlock],
    });
  }

  appendBlocks(
    parentId: string,
    children: BlockObjectRequest[]
  ): Promise<ListBlockChildrenResponse> {
    return withRetry(
      () =>
        this.notion.blocks.children.append({
          block_id: parentId,
          children,
        }),
      { label: 'blocks.children.append:batch' }
    );
  }

  createPage(
    parentPageId: string,
    title: string
  ): Promise<CreatePageResponse> {
    return withRetry(
      () =>
        this.notion.pages.create({
          parent: { page_id: parentPageId },
          properties: {
            title: {
              type: 'title',
              title: [{ text: { content: title } }],
            },
          },
        }),
      { label: 'pages.create' }
    );
  }

  async uploadFile(
    filename: string,
    contentType: string,
    data: Buffer
  ): Promise<string> {
    const created = await this.notion.fileUploads.create({
      mode: 'single_part',
      filename,
      content_type: contentType,
    });

    const blob = new Blob([new Uint8Array(data)], { type: contentType });

    await this.notion.fileUploads.send({
      file_upload_id: created.id,
      file: { data: blob, filename },
    });

    return created.id;
  }

  getDatabase(id: string): Promise<GetDatabaseResponse> {
    return withRetry(
      () => this.notion.databases.retrieve({ database_id: id }),
      { label: 'databases.retrieve' }
    );
  }

  async queryDatabasePreview(
    id: string,
    pageSize: number
  ): Promise<{ results: unknown[]; hasMore: boolean; totalRowCount: number }> {
    const queryLabel = uniqueTimerLabel(`queryDatabasePreview:${id}`);
    console.time(queryLabel);

    const database = await withRetry(
      () => this.notion.databases.retrieve({ database_id: id }),
      { label: 'databases.retrieve:queryDatabasePreview' }
    );
    const dataSources = isFullDatabase(database) ? database.data_sources : [];

    if (dataSources.length === 0) {
      console.timeEnd(queryLabel);
      return { results: [], hasMore: false, totalRowCount: 0 };
    }

    const firstDataSource = dataSources[0];
    const response = await withRetry(
      () =>
        this.notion.dataSources.query({
          data_source_id: firstDataSource.id,
          page_size: pageSize,
        }),
      { label: 'dataSources.query:preview' }
    );

    console.timeEnd(queryLabel);
    return {
      results: response.results,
      hasMore: response.has_more,
      totalRowCount: response.has_more ? response.results.length : response.results.length,
    };
  }

  async queryDatabase(
    id: string,
    all?: boolean
  ): Promise<QueryDataSourceResponse> {
    const queryLabel = uniqueTimerLabel(`queryDatabase:${id}${all}`);
    console.time(queryLabel);

    const database = await withRetry(
      () => this.notion.databases.retrieve({ database_id: id }),
      { label: 'databases.retrieve:queryDatabase' }
    );
    const dataSources = isFullDatabase(database) ? database.data_sources : [];

    const aggregated: QueryDataSourceResponse = {
      object: 'list',
      type: 'page_or_data_source',
      page_or_data_source: {},
      results: [],
      next_cursor: null,
      has_more: false,
    };

    for (const dataSource of dataSources) {
      let cursor: string | null = null;
      do {
        const response = await withRetry(
          () =>
            this.notion.dataSources.query({
              data_source_id: dataSource.id,
              page_size: DEFAULT_PAGE_SIZE_LIMIT,
              ...(cursor ? { start_cursor: cursor } : {}),
            }),
          { label: 'dataSources.query' }
        );
        aggregated.results.push(...response.results);
        cursor = all && response.has_more ? response.next_cursor : null;
      } while (cursor);
    }

    console.timeEnd(queryLabel);
    return aggregated;
  }

  async searchTopLevelPages(
    query: string,
    opts: { maxResults?: number; maxPages?: number } = {}
  ): Promise<{
    results: Array<{
      id: string;
      object: 'page';
      url: string | null;
      icon: unknown;
      title: string;
      parent: { type: string };
    }>;
  }> {
    const maxResults = opts.maxResults ?? 50;
    const maxPages = opts.maxPages ?? 20;
    const collected: Array<{
      id: string;
      object: 'page';
      url: string | null;
      icon: unknown;
      title: string;
      parent: { type: string };
    }> = [];
    let cursor: string | undefined;
    for (let page = 0; page < maxPages; page++) {
      const response: SearchResponse = await withRetry(
        () =>
          this.notion.search({
            page_size: DEFAULT_PAGE_SIZE_LIMIT,
            query,
            filter: { value: 'page', property: 'object' },
            sort: {
              direction: 'descending',
              timestamp: 'last_edited_time',
            },
            ...(cursor ? { start_cursor: cursor } : {}),
          }),
        { label: 'searchTopLevelPages' }
      );
      for (const entry of response.results) {
        const e = entry as {
          id: string;
          object: string;
          url?: string;
          icon?: unknown;
          parent?: { type?: string };
        };
        const parentType = e.parent?.type;
        if (parentType === 'database_id' || parentType === 'data_source_id') {
          continue;
        }
        const title = (
          getNotionObjectTitle(entry as never, { emoji: false }) ?? ''
        ).trim();
        if (title.length === 0) {
          continue;
        }
        collected.push({
          id: e.id,
          object: 'page',
          url: e.url ?? null,
          icon: e.icon,
          title,
          parent: { type: parentType ?? 'workspace' },
        });
        if (collected.length >= maxResults) {
          return { results: collected };
        }
      }
      if (!response.has_more || response.next_cursor == null) {
        break;
      }
      cursor = response.next_cursor;
    }
    return { results: collected };
  }

  async search(query: string, all?: boolean) {
    const searchLabel = uniqueTimerLabel(all ? 'search:all' : 'search:single');
    console.time(searchLabel);
    const response = await withRetry(
      () =>
        this.notion.search({
          page_size: DEFAULT_PAGE_SIZE_LIMIT,
          query,
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time',
          },
        }),
      { label: 'search' }
    );

    if (all && response.has_more && response.next_cursor) {
      while (true) {
        const res2: SearchResponse = await withRetry(
          () =>
            this.notion.search({
              page_size: DEFAULT_PAGE_SIZE_LIMIT,
              query,
              start_cursor: response.next_cursor!,
              sort: {
                direction: 'descending',
                timestamp: 'last_edited_time',
              },
            }),
          { label: 'search:page' }
        );
        response.results.push(...res2.results);
        if (res2.next_cursor) {
          response.next_cursor = res2.next_cursor;
        } else {
          break;
        }
      }
    }

    console.timeEnd(searchLabel);
    return collapseDataSourcesToDatabases(response);
  }

  static GetClientID(): string {
    return process.env.NOTION_CLIENT_ID!;
  }

  async getTopLevelTags(
    pageId: string,
    rules: ParserRules,
    createdAt: string,
    lastEditedAt: string
  ) {
    const useHeadings = rules.TAGS === 'heading';
    const response = await this.getBlocks({
      createdAt,
      lastEditedAt,
      id: pageId,
      all: true,
      type: 'page',
    });
    const globalTags = [];
    if (useHeadings) {
      const headings = response.results.filter((block) => isHeading(block));
      for (const heading of headings) {
        if (isFullBlock(heading)) {
          const newTag = getHeadingText(heading)
            ?.map((t) => t.plain_text)
            .join('');
          if (newTag) {
            globalTags.push(newTag);
          }
        }
      }
    } else {
      const paragraphs = getParagraphBlocks(response.results);
      for (const p of paragraphs) {
        const pp = p.paragraph;

        if (!pp) {
          continue;
        }

        const tt = pp.rich_text;
        if (!tt || tt.length < 1) {
          continue;
        }

        const { annotations } = tt[0];
        if (annotations.strikethrough) {
          globalTags.push(tt[0].plain_text);
        }
      }
    }
    return sanitizeTags(globalTags);
  }

  getBlockTitle(icon: string | null, title: string, settings: CardOption) {
    if (!icon) {
      return title;
    }

    // the order here matters due to icon not being set and last not being default
    return settings.pageEmoji !== 'last_emoji'
      ? `${icon}${title}`
      : `${title}${icon}`;
  }

  async getPageTitle(
    page: GetPageResponse | null,
    settings: CardOption
  ): Promise<string> {
    if (!page) {
      return '';
    }
    let title =
      getNotionObjectTitle(page, { emoji: false }) ?? `Untitled: ${new Date()}`;
    let icon = await renderIcon(
      getBlockIcon(page as WithIcon, settings.pageEmoji)
    );
    return this.getBlockTitle(icon, title, settings);
  }

  async getDatabaseTitle(
    database: GetDatabaseResponse,
    settings: CardOption
  ): Promise<string> {
    let icon = await renderIcon(
      getBlockIcon(database as WithIcon, settings.pageEmoji)
    );
    let title = isFullDatabase(database)
      ? database.title.map((t) => t.plain_text).join('')
      : '';
    return this.getBlockTitle(icon, title, settings);
  }
}

export default NotionAPIWrapper;
