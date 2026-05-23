import { isFullBlock, isFullPage } from '@notionhq/client';
import { BlockObjectResponse, PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { getNotionObjectTitle } from 'get-notion-object-title';

import { IShowcaseRepository } from '../../data_layer/ShowcaseRepository';
import { PreviewBlockPayload, toPreviewBlock } from '../../controllers/helpers/toPreviewBlock';
import ParserRules from '../../lib/parser/ParserRules';
import { renderBlockPreview } from '../../services/NotionService/helpers/renderBlockPreview';
import instrumentedAxios from '../../services/observability/instrumentedAxios';
import type { NotionService } from '../../services/NotionService/NotionService';
import type ApkgPreviewService from '../../services/ApkgPreviewService/ApkgPreviewService';
import type { ParsedApkg } from '../../services/ApkgPreviewService/ApkgPreviewService';
import type DownloadService from '../../services/DownloadService';
import StorageHandler from '../../lib/storage/StorageHandler';

const MAX_BLOCKS = 8;
const MAX_CARDS = 3;

export interface ShowcaseBlockPayload extends PreviewBlockPayload {
  childrenHtml?: string;
}

export class PopulateShowcaseUseCase {
  constructor(
    private readonly showcaseRepo: IShowcaseRepository,
    private readonly notionService: NotionService,
    private readonly previewService: ApkgPreviewService,
    private readonly downloadService: DownloadService
  ) {}

  async execute(owner: string, pageId: string, apkgKey: string): Promise<void> {
    const api = await this.notionService.getNotionAPI(owner);

    const [blocksResponse, pageData, rules] = await Promise.all([
      api.listBlocksPage(pageId, { pageSize: MAX_BLOCKS }),
      this.fetchPageTitle(api, pageId),
      ParserRules.Load(owner, pageId),
    ]);
    const classifyRules = { flashcardTypes: rules.flaschardTypeNames() };

    const baseBlocks = blocksResponse.results
      .filter((block): block is BlockObjectResponse => isFullBlock(block))
      .map((block) => toPreviewBlock(block, classifyRules));

    const notionBlocks: ShowcaseBlockPayload[] = await Promise.all(
      baseBlocks.map(async (block) => {
        if (block.canExpand && block.hasChildren) {
          const childrenHtml = await this.fetchChildrenHtml(api, block.id);
          return { ...block, childrenHtml };
        }
        return block;
      })
    );

    const storage = new StorageHandler();
    const body = await this.downloadService.getFileBody(owner, apkgKey, storage);
    if (body == null) {
      throw new Error(`APKG file not found for key: ${apkgKey}`);
    }

    const cacheKey = `showcase:${apkgKey}`;
    const parsed = await this.previewService.parse(cacheKey, body as Buffer);
    const { cards: allCards } = this.previewService.getCardsPage(parsed, 0, MAX_CARDS * 3, '');
    const cards = allCards.slice(0, MAX_CARDS).map((card) => ({
      ...card,
      front: this.inlineApkgMedia(card.front, parsed),
      back: this.inlineApkgMedia(card.back, parsed),
    }));

    await this.showcaseRepo.upsert({
      pageTitle: pageData.pageTitle,
      notionBlocks,
      ankiCards: cards,
      populatedAt: new Date(),
    });
  }

  private inlineApkgMedia(html: string, parsed: ParsedApkg): string {
    return html.replace(/<img\s+src="([^"]+)"/g, (_match, src: string) => {
      const archiveName = parsed.mediaMap.get(src);
      const buffer = archiveName ? parsed.mediaEntries.get(archiveName) : null;
      if (buffer == null) return _match;
      const ext = src.split('.').pop()?.toLowerCase() ?? 'png';
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
      const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;
      return `<img src="${dataUri}"`;
    });
  }

  private async fetchChildrenHtml(
    api: Awaited<ReturnType<NotionService['getNotionAPI']>>,
    blockId: string
  ): Promise<string> {
    try {
      const response = await api.listBlocksPage(blockId, { pageSize: 5 });
      const htmlParts = response.results
        .filter((b): b is BlockObjectResponse => isFullBlock(b))
        .map((b) => renderBlockPreview(b))
        .filter(Boolean);
      const joined = htmlParts.join('');
      return this.inlineImages(joined);
    } catch {
      return '';
    }
  }

  private async inlineImages(html: string): Promise<string> {
    const imgRegex = /<img\s+src="([^"]+)"/g;
    const matches = [...html.matchAll(imgRegex)];
    if (matches.length === 0) return html;

    let result = html;
    for (const match of matches) {
      const url = match[1].replaceAll('&amp;', '&');
      if (url.startsWith('data:')) continue;
      try {
        const response = await instrumentedAxios.get('notion', url, {
          responseType: 'arraybuffer',
          timeout: 15_000,
        });
        const contentType =
          response.headers['content-type'] ?? 'image/png';
        const base64 = Buffer.from(response.data as ArrayBuffer).toString('base64');
        const dataUri = `data:${contentType};base64,${base64}`;
        result = result.replace(match[1], dataUri);
      } catch {
        // leave original URL if download fails
      }
    }
    return result;
  }

  private async fetchPageTitle(
    api: Awaited<ReturnType<NotionService['getNotionAPI']>>,
    pageId: string
  ): Promise<{ pageTitle: string }> {
    try {
      const page = await api.getPage(pageId);
      if (page && isFullPage(page as PageObjectResponse)) {
        const full = page as PageObjectResponse;
        return { pageTitle: getNotionObjectTitle(full, { emoji: true }) };
      }
    } catch {
      // fall through to default
    }
    return { pageTitle: 'Untitled' };
  }
}
