import crypto from 'node:crypto';
import instrumentedAxios from '../../services/observability/instrumentedAxios';
import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkifySyncMappingsRepositoryInterface } from '../../data_layer/ankify/AnkifySyncMappingsRepository';
import { AnkifySyncConflictsRepositoryInterface } from '../../data_layer/ankify/AnkifySyncConflictsRepository';
import { AnkifyNotionSubscriptionsRepositoryInterface } from '../../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import { AnkifySyncLogsRepositoryInterface } from '../../data_layer/ankify/AnkifySyncLogsRepository';
import { INotionRepository } from '../../data_layer/NotionRespository';
import { IErrorEventRepository } from '../../data_layer/ErrorEventRepository';

export type OnTokenInvalidFn = (owner: number) => Promise<void>;
import {
  AnkifyClient,
  AnkifyNotionSubscription,
  AnkifySyncMapping,
} from '../../entities/ankify';
import { AnkiConnectClient } from '../../services/ankify/AnkiConnectClient';
import {
  ANKIFY_BASIC_MODEL,
  ankifyBasicCreateModelParams,
  ankifyClozeCreateModelParams,
} from '../../services/ankify/ankifyModels';
import { ensureAnkifyModels } from '../../services/ankify/ensureAnkifyModels';
import {
  AnkifyTemplateOverrides,
  AnkifyTemplateOverridesProvider,
  buildBasicModelFromTemplate,
} from '../../services/ankify/templateOverrides';
import {
  walkNotionPageForFlashcards,
  walkNotionDatabaseForFlashcards,
  NotionBlockChildrenFetcher,
  WalkNotionPageResult,
  WalkedNotionFlashcard,
  WalkedNotionMediaRef,
  SyncDiagnostic,
} from '../../services/ankify/notionPageWalker';
import {
  notionDatabasePagesFetcherFactory,
  NotionDatabasePagesFetcherFactory,
} from '../../services/ankify/notionDatabasePagesFetcher';
import { NoActiveAnkifyClientError } from './SendUploadToRacUseCase';
import { NotionNotConnectedError } from './ExportReviewDataToNotionUseCase';
import { isNotionDatabaseNotPageError } from '../../services/NotionService/helpers/isNotionDatabaseNotPageError';
import { sanitizeDeckPath } from '../../lib/ankify/transforms/tags';
import { buildDeckName } from '../../lib/ankify/transforms/deckName';

export { NotionNotConnectedError } from './ExportReviewDataToNotionUseCase';

export interface SyncNotionPageInput {
  owner: number;
  notionPageId: string;
  notionPageTitle?: string | null;
  notionPageUrl?: string | null;
  notionPageIcon?: string | null;
  targetDeck?: string | null;
  trigger: 'manual' | 'polling' | 'webhook';
  ankiConnectHost?: string;
}

export interface NotionPageMeta {
  title: string | null;
  url: string | null;
  icon: string | null;
}

export type NotionPageMetaFetcher = (
  token: string
) => (notionPageId: string) => Promise<NotionPageMeta>;

export type AnkiWebSyncStatus = 'synced' | 'failed' | 'skipped';

export interface SyncNotionPageResult {
  client: AnkifyClient;
  subscription: AnkifyNotionSubscription;
  created: number;
  updated: number;
  conflicts: number;
  unchanged: number;
  errors: string[];
  ankiWebSync: AnkiWebSyncStatus;
  ankiWebSyncError: string | null;
  diagnostic: SyncDiagnostic | null;
}

export type AnkiConnectFactory = (
  host: string,
  port: number,
  apiKey: string | null
) => AnkiConnectClient;

export type NotionFetcherFactory = (
  token: string
) => NotionBlockChildrenFetcher;

const FRONT_FIELD_BASIC = 'Front';
const BACK_FIELD_BASIC = 'Back';

export interface AnkifyMediaResponse {
  status: number;
  data: Buffer;
}

export type AnkifyMediaFetcher = (url: string) => Promise<AnkifyMediaResponse>;

const guardedMediaFetcher: AnkifyMediaFetcher = async (url) => {
  const response = await instrumentedAxios.get<Buffer>('notion', url, {
    responseType: 'arraybuffer',
  });
  return { status: response.status, data: Buffer.from(response.data) };
};

export type AnkifyZeroReasonCode =
  | 'empty_page'
  | 'no_matching_blocks'
  | 'all_blocks_unmatched';

const deriveReasonCode = (diagnostic: SyncDiagnostic): AnkifyZeroReasonCode => {
  if (diagnostic.blocks_scanned === 0) {
    return 'empty_page';
  }
  if (
    diagnostic.pattern_hits == null ||
    Object.keys(diagnostic.pattern_hits).length === 0
  ) {
    return 'all_blocks_unmatched';
  }
  return 'no_matching_blocks';
};

const summarizeCardErrors = (errors: string[]): string | null => {
  if (errors.length === 0) {
    return null;
  }
  const noun = errors.length === 1 ? 'card' : 'cards';
  return `${errors.length} ${noun} failed: ${errors[0]}`;
};

function isNotionNotFoundError(error: unknown): boolean {
  return (
    error != null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: unknown }).code === 'object_not_found'
  );
}

function isNotionUnauthorizedError(error: unknown): boolean {
  return (
    error != null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: unknown }).code === 'unauthorized'
  );
}

export class SyncNotionPageToRacUseCase {
  private readonly modelCacheByClient = new Map<number, Set<string>>();

  constructor(
    private readonly clients: AnkifyClientsRepositoryInterface,
    private readonly mappings: AnkifySyncMappingsRepositoryInterface,
    private readonly conflicts: AnkifySyncConflictsRepositoryInterface,
    private readonly subscriptions: AnkifyNotionSubscriptionsRepositoryInterface,
    private readonly logs: AnkifySyncLogsRepositoryInterface,
    private readonly notionRepo: INotionRepository,
    private readonly ankiConnect: AnkiConnectFactory,
    private readonly notionFetcher: NotionFetcherFactory,
    private readonly notionPageMeta?: NotionPageMetaFetcher,
    private readonly mediaFetcher: AnkifyMediaFetcher = guardedMediaFetcher,
    private readonly errorEvents?: IErrorEventRepository,
    private readonly onTokenInvalid?: OnTokenInvalidFn,
    private readonly templateOverridesProvider?: AnkifyTemplateOverridesProvider,
    private readonly databasePagesFetcher: NotionDatabasePagesFetcherFactory = notionDatabasePagesFetcherFactory
  ) {}

  private modelCache(clientId: number): Set<string> {
    let cache = this.modelCacheByClient.get(clientId);
    if (cache == null) {
      cache = new Set<string>();
      this.modelCacheByClient.set(clientId, cache);
    }
    return cache;
  }

  async execute(input: SyncNotionPageInput): Promise<SyncNotionPageResult> {
    const client = await this.clients.findActiveByOwner(input.owner);
    if (client == null) {
      throw new NoActiveAnkifyClientError();
    }
    await this.clients.touchLastActiveAt(client.id);

    const token = await this.notionRepo.getNotionToken(String(input.owner));
    if (token == null || token.trim().length === 0) {
      throw new NotionNotConnectedError();
    }

    const { pageTitle, pageUrl, pageIcon } = await this.resolvePageMeta(
      token,
      input
    );

    const subscription = await this.subscriptions.upsert({
      owner: input.owner,
      ankify_client_id: client.id,
      notion_page_id: input.notionPageId,
      notion_page_title: pageTitle,
      notion_page_url: pageUrl,
      notion_page_icon: pageIcon,
      target_deck: input.targetDeck,
      enabled: true,
    });

    const result: SyncNotionPageResult = {
      client,
      subscription,
      created: 0,
      updated: 0,
      conflicts: 0,
      unchanged: 0,
      errors: [],
      ankiWebSync: 'skipped',
      ankiWebSyncError: null,
      diagnostic: null,
    };

    try {
      await this.runSync({ input, token, client, subscription, result });
      await this.subscriptions.recordPoll(subscription.id, {
        synced: true,
        error: summarizeCardErrors(result.errors),
      });
    } catch (error) {
      const message = (error as Error).message;
      result.errors.push(message);
      await this.subscriptions.recordPoll(subscription.id, {
        error: message,
      });
      if (isNotionNotFoundError(error)) {
        await this.subscriptions.setEnabled(subscription.id, false);
      }
      if (isNotionUnauthorizedError(error)) {
        if (this.onTokenInvalid != null) {
          await this.onTokenInvalid(input.owner);
        } else {
          await this.notionRepo.markTokenInvalid(input.owner);
        }
        await this.subscriptions.setEnabled(subscription.id, false);
      }
      throw error;
    } finally {
      await this.persistSyncLog(input, client, result);
    }

    return result;
  }

  private async resolvePageMeta(
    token: string,
    input: SyncNotionPageInput
  ): Promise<{
    pageTitle: string | null | undefined;
    pageUrl: string | null | undefined;
    pageIcon: string | null | undefined;
  }> {
    let pageTitle: string | null | undefined = input.notionPageTitle;
    let pageUrl: string | null | undefined = input.notionPageUrl;
    let pageIcon: string | null | undefined = input.notionPageIcon;
    if (this.notionPageMeta == null) {
      return { pageTitle, pageUrl, pageIcon };
    }
    try {
      const meta = await this.notionPageMeta(token)(input.notionPageId);
      pageTitle = meta.title;
      pageUrl = meta.url;
      pageIcon = meta.icon;
    } catch {
      // Notion API hiccup — keep whatever the input or DB already has.
    }
    return { pageTitle, pageUrl, pageIcon };
  }

  private emitZeroCardsEvent(
    input: SyncNotionPageInput,
    diagnostic: SyncDiagnostic
  ): void {
    if (this.errorEvents == null) {
      return;
    }
    const reasonCode = deriveReasonCode(diagnostic);
    const pageIdHash = crypto
      .createHash('sha256')
      .update(input.notionPageId)
      .digest('hex');
    this.errorEvents
      .insert({
        source: 'server',
        message: 'ankify.zero_cards',
        message_hash: crypto
          .createHash('sha256')
          .update(`ankify.zero_cards:${pageIdHash}:${input.owner}`)
          .digest('hex'),
        context: {
          user_id: input.owner,
          source_type: 'notion_page',
          file_hash: pageIdHash,
          input_chars: diagnostic.blocks_scanned,
          ai_response_chars: 0,
          parser_path: 'ankify/notionPageWalker',
          reason_code: reasonCode,
          blocks_scanned: diagnostic.blocks_scanned,
          blocks_matched: diagnostic.blocks_matched,
          trigger: input.trigger,
        },
      })
      .catch((err) => {
        console.error('[ankify-sync] failed to emit zero_cards event', err);
      });
  }

  private async runSync(args: {
    input: SyncNotionPageInput;
    token: string;
    client: AnkifyClient;
    subscription: AnkifyNotionSubscription;
    result: SyncNotionPageResult;
  }): Promise<void> {
    const { input, token, client, subscription, result } = args;
    const fetchChildren = this.notionFetcher(token);
    const { cards, diagnostic } = await this.walkSource(
      input.notionPageId,
      token,
      fetchChildren
    );
    result.diagnostic = diagnostic;

    if (cards.length === 0) {
      this.emitZeroCardsEvent(input, diagnostic);
    }

    const ac = this.ankiConnect(
      input.ankiConnectHost ?? 'localhost',
      client.anki_port,
      client.anki_connect_api_key
    );
    const deckName = buildDeckName(
      subscription.target_deck,
      subscription.notion_page_title
    );
    await ac.createDeck(deckName);
    const overrides =
      (await this.templateOverridesProvider?.(
        input.owner,
        input.notionPageId
      )) ?? null;
    await ensureAnkifyModels(ac, this.modelCache(client.id), overrides);
    await this.refreshAnkifyModelStyling(ac, overrides);

    for (const card of cards) {
      await this.processCard({
        card,
        client,
        subscription,
        ac,
        input,
        result,
        deckName,
        overrides,
      });
    }

    await this.consolidateMappedNotes({
      cards,
      client,
      subscription,
      ac,
      input,
      result,
      deckName,
    });

    await this.runFinalAnkiWebSync(ac, result);
  }

  private async consolidateMappedNotes(args: {
    cards: WalkedNotionFlashcard[];
    client: AnkifyClient;
    subscription: AnkifyNotionSubscription;
    ac: AnkiConnectClient;
    input: SyncNotionPageInput;
    result: SyncNotionPageResult;
    deckName: string;
  }): Promise<void> {
    const { cards, client, subscription, ac, input, result, deckName } = args;
    if (sanitizeDeckPath(subscription.target_deck).length === 0) {
      return;
    }

    const misplaced: AnkifySyncMapping[] = [];
    for (const card of cards) {
      const mapping = await this.mappings.findBySourceId(
        client.id,
        card.notion_block_id
      );
      if (mapping != null && mapping.deck_name !== deckName) {
        misplaced.push(mapping);
      }
    }
    if (misplaced.length === 0) {
      return;
    }

    const noteIds = misplaced.map((m) => m.anki_note_id);
    const info = await ac.notesInfo(noteIds);
    const cardIds = info.flatMap((note) => note.cards ?? []);
    if (cardIds.length > 0) {
      await ac.changeDeck(cardIds, deckName);
    }

    for (const mapping of misplaced) {
      await this.mappings.upsert({
        ankify_client_id: client.id,
        source_id: mapping.source_id,
        source_type: mapping.source_type,
        anki_note_id: mapping.anki_note_id,
        deck_name: deckName,
      });
    }

    this.emitFollowedDeckEvent(input, deckName, misplaced.length);
    result.updated += misplaced.length;
  }

  private emitFollowedDeckEvent(
    input: SyncNotionPageInput,
    deckName: string,
    movedNotes: number
  ): void {
    if (this.errorEvents == null) {
      return;
    }
    const pageIdHash = crypto
      .createHash('sha256')
      .update(input.notionPageId)
      .digest('hex');
    const deckHash = crypto.createHash('sha256').update(deckName).digest('hex');
    this.errorEvents
      .insert({
        source: 'server',
        message: 'ankify.sync_followed_deck',
        message_hash: crypto
          .createHash('sha256')
          .update(`ankify.sync_followed_deck:${pageIdHash}:${input.owner}`)
          .digest('hex'),
        context: {
          user_id: input.owner,
          source_type: 'notion_page',
          file_hash: pageIdHash,
          deck_hash: deckHash,
          moved_notes: movedNotes,
          trigger: input.trigger,
        },
      })
      .catch((err) => {
        console.error(
          '[ankify-sync] failed to emit sync_followed_deck event',
          err
        );
      });
  }

  private async walkSource(
    notionId: string,
    token: string,
    fetchChildren: NotionBlockChildrenFetcher
  ): Promise<WalkNotionPageResult> {
    let pageResult: WalkNotionPageResult;
    try {
      pageResult = await walkNotionPageForFlashcards(notionId, fetchChildren);
    } catch (error) {
      if (isNotionDatabaseNotPageError(error)) {
        return walkNotionDatabaseForFlashcards(
          notionId,
          fetchChildren,
          this.databasePagesFetcher(token)
        );
      }
      throw error;
    }
    if (pageResult.cards.length > 0) {
      return pageResult;
    }
    return this.walkDatabaseOrFallback(
      notionId,
      token,
      fetchChildren,
      pageResult
    );
  }

  private async walkDatabaseOrFallback(
    notionId: string,
    token: string,
    fetchChildren: NotionBlockChildrenFetcher,
    pageResult: WalkNotionPageResult
  ): Promise<WalkNotionPageResult> {
    try {
      const databaseResult = await walkNotionDatabaseForFlashcards(
        notionId,
        fetchChildren,
        this.databasePagesFetcher(token)
      );
      if (databaseResult.cards.length > 0) {
        return databaseResult;
      }
      return pageResult;
    } catch {
      return pageResult;
    }
  }

  private async uploadCardMedia(
    ac: AnkiConnectClient,
    card: WalkedNotionFlashcard,
    result: SyncNotionPageResult
  ): Promise<void> {
    for (const ref of card.media) {
      if (ref.filename == null) {
        continue;
      }
      await this.uploadSingleMediaRef(ac, ref, result);
    }
  }

  private async uploadSingleMediaRef(
    ac: AnkiConnectClient,
    ref: WalkedNotionMediaRef,
    result: SyncNotionPageResult
  ): Promise<void> {
    if (ref.filename == null) {
      return;
    }
    try {
      const response = await this.mediaFetcher(ref.url);
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`HTTP ${response.status}`);
      }
      await ac.storeMediaFile({
        filename: ref.filename,
        data: response.data.toString('base64'),
      });
    } catch (error) {
      result.errors.push(
        `${ref.kind} ${ref.block_id}: ${(error as Error).message}`
      );
    }
  }

  private async refreshAnkifyModelStyling(
    ac: AnkiConnectClient,
    overrides: AnkifyTemplateOverrides | null
  ): Promise<void> {
    const basic = overrides
      ? buildBasicModelFromTemplate(
          overrides.basicTemplate,
          overrides.basicModelName
        )
      : ankifyBasicCreateModelParams();
    const cloze = ankifyClozeCreateModelParams();
    await ac.updateModelStyling({ name: basic.modelName, css: basic.css });
    await ac.updateModelStyling({ name: cloze.modelName, css: cloze.css });
    await ac.updateModelTemplates({
      name: basic.modelName,
      templates: Object.fromEntries(
        basic.cardTemplates.map((t) => [
          t.Name,
          { Front: t.Front, Back: t.Back },
        ])
      ),
    });
    await ac.updateModelTemplates({
      name: cloze.modelName,
      templates: Object.fromEntries(
        cloze.cardTemplates.map((t) => [
          t.Name,
          { Front: t.Front, Back: t.Back },
        ])
      ),
    });
  }

  private buildBasicNote(args: {
    deckName: string;
    front: string;
    back: string;
    overrides: AnkifyTemplateOverrides | null;
  }) {
    const modelName = args.overrides?.basicModelName ?? ANKIFY_BASIC_MODEL;
    const fields: Record<string, string> = {
      [FRONT_FIELD_BASIC]: args.front,
      [BACK_FIELD_BASIC]: args.back,
    };
    if (args.overrides) {
      fields.MyMedia = '';
    }
    return {
      deckName: args.deckName,
      modelName,
      fields,
      tags: ['ankify-notion-sync'],
      options: { allowDuplicate: true },
    };
  }

  private async processCard(args: {
    card: WalkedNotionFlashcard;
    client: AnkifyClient;
    subscription: AnkifyNotionSubscription;
    ac: AnkiConnectClient;
    input: SyncNotionPageInput;
    result: SyncNotionPageResult;
    deckName: string;
    overrides: AnkifyTemplateOverrides | null;
  }): Promise<void> {
    const {
      card,
      client,
      subscription,
      ac,
      input,
      result,
      deckName,
      overrides,
    } = args;
    try {
      await this.uploadCardMedia(ac, card, result);
      const existing = await this.mappings.findBySourceId(
        client.id,
        card.notion_block_id
      );
      if (existing == null) {
        const ankiNoteId = await ac.addNote(
          this.buildBasicNote({
            deckName,
            front: card.front,
            back: card.back,
            overrides,
          })
        );
        await this.mappings.upsert({
          ankify_client_id: client.id,
          source_id: card.notion_block_id,
          source_type: 'notion_block',
          anki_note_id: ankiNoteId,
          deck_name: deckName,
        });
        result.created += 1;
        return;
      }

      const hasOpenConflict = await this.conflicts.hasPending(
        client.id,
        card.notion_block_id
      );
      if (hasOpenConflict) {
        result.conflicts += 1;
        return;
      }

      await this.reconcileExistingCard({
        card,
        existing,
        client,
        subscription,
        ac,
        input,
        result,
        deckName,
        overrides,
      });
    } catch (error) {
      result.errors.push(
        `Block ${card.notion_block_id}: ${(error as Error).message}`
      );
    }
  }

  private async reconcileExistingCard(args: {
    card: WalkedNotionFlashcard;
    existing: AnkifySyncMapping;
    client: AnkifyClient;
    subscription: AnkifyNotionSubscription;
    ac: AnkiConnectClient;
    input: SyncNotionPageInput;
    result: SyncNotionPageResult;
    deckName: string;
    overrides: AnkifyTemplateOverrides | null;
  }): Promise<void> {
    const { card, existing, client, ac, result, deckName, overrides } = args;
    const lastSyncedAt = existing.last_synced_at;
    const ankiInfo = await ac.notesInfo([existing.anki_note_id]);
    const ankiNote = ankiInfo[0];

    if (ankiNote?.noteId == null) {
      await this.mappings.deleteByAnkiNoteId(client.id, existing.anki_note_id);
      const ankiNoteId = await ac.addNote(
        this.buildBasicNote({
          deckName,
          front: card.front,
          back: card.back,
          overrides,
        })
      );
      await this.mappings.upsert({
        ankify_client_id: client.id,
        source_id: card.notion_block_id,
        source_type: existing.source_type,
        anki_note_id: ankiNoteId,
        deck_name: deckName,
      });
      result.created += 1;
      return;
    }

    const ankiMod = ankiNote.mod ?? null;
    const ankiFront = ankiNote.fields?.[FRONT_FIELD_BASIC]?.value ?? '';
    const ankiBack = ankiNote.fields?.[BACK_FIELD_BASIC]?.value ?? '';
    const lastSyncedSeconds = Math.floor(lastSyncedAt.getTime() / 1000);
    const { subscription, input } = args;

    const notionChanged =
      card.notion_last_edited_at.getTime() > lastSyncedAt.getTime();
    const ankiChanged = ankiMod != null && ankiMod > lastSyncedSeconds;
    const ankiContentDiffers =
      ankiFront !== card.front || ankiBack !== card.back;

    if (notionChanged && ankiChanged && ankiContentDiffers) {
      await this.conflicts.recordOrFindPending({
        owner: input.owner,
        ankify_client_id: client.id,
        subscription_id: subscription.id,
        source_id: card.notion_block_id,
        anki_note_id: existing.anki_note_id,
        kind: 'both_edited',
        notion_last_edited_at: card.notion_last_edited_at,
        anki_modified_at: ankiMod,
        notion_snapshot: { front: card.front, back: card.back },
        anki_snapshot: { front: ankiFront, back: ankiBack },
      });
      result.conflicts += 1;
      return;
    }

    if (notionChanged && ankiContentDiffers) {
      await ac.updateNoteFields(existing.anki_note_id, {
        [FRONT_FIELD_BASIC]: card.front,
        [BACK_FIELD_BASIC]: card.back,
      });
      await this.mappings.upsert({
        ankify_client_id: client.id,
        source_id: card.notion_block_id,
        source_type: existing.source_type,
        anki_note_id: existing.anki_note_id,
        deck_name: existing.deck_name,
      });
      result.updated += 1;
      return;
    }

    result.unchanged += 1;
  }

  private async runFinalAnkiWebSync(
    ac: AnkiConnectClient,
    result: SyncNotionPageResult
  ): Promise<void> {
    if (result.created + result.updated === 0) {
      return;
    }
    try {
      await ac.sync();
      result.ankiWebSync = 'synced';
    } catch (syncError) {
      result.ankiWebSync = 'failed';
      result.ankiWebSyncError = (syncError as Error).message;
    }
  }

  private async persistSyncLog(
    input: SyncNotionPageInput,
    client: AnkifyClient,
    result: SyncNotionPageResult
  ): Promise<void> {
    await this.logs
      .log({
        owner: input.owner,
        kind: 'dispatch',
        status: result.errors.length > 0 ? 'error' : 'success',
        message: `notion-page sync ${input.trigger} for ${input.notionPageId} (created ${result.created}, updated ${result.updated}, conflicts ${result.conflicts})`,
        payload: {
          trigger: input.trigger,
          page_id: input.notionPageId,
          ankify_client_id: client.id,
          created: result.created,
          updated: result.updated,
          conflicts: result.conflicts,
          unchanged: result.unchanged,
          errors: result.errors,
          diagnostic: result.diagnostic,
        },
      })
      .catch((e) => {
        console.error('[ankify-sync-log] failed to record sync', e);
      });
  }
}
