import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkifySyncMappingsRepositoryInterface } from '../../data_layer/ankify/AnkifySyncMappingsRepository';
import { AnkifySyncConflictsRepositoryInterface } from '../../data_layer/ankify/AnkifySyncConflictsRepository';
import { AnkifyNotionSubscriptionsRepositoryInterface } from '../../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import { AnkifySyncLogsRepositoryInterface } from '../../data_layer/ankify/AnkifySyncLogsRepository';
import { INotionRepository } from '../../data_layer/NotionRespository';
import { AnkifyConflictResolution } from '../../entities/ankify';
import { buildDeckName } from '../../lib/ankify/transforms/deckName';
import { AnkiConnectFactory } from './SyncNotionPageToRacUseCase';
import { NotionNotConnectedError } from './ExportReviewDataToNotionUseCase';

export class ConflictNotFoundError extends Error {
  constructor() {
    super('Conflict not found or already resolved');
    this.name = 'ConflictNotFoundError';
  }
}

export type NotionPageUpdateClientFactory = (token: string) => {
  updateBlockContent(
    blockId: string,
    payload: { front: string; back: string }
  ): Promise<void>;
};

export interface ResolveConflictInput {
  id: number;
  owner: number;
  resolution: AnkifyConflictResolution;
  ankiConnectHost?: string;
}

export class ResolveConflictUseCase {
  constructor(
    private readonly clients: AnkifyClientsRepositoryInterface,
    private readonly mappings: AnkifySyncMappingsRepositoryInterface,
    private readonly conflicts: AnkifySyncConflictsRepositoryInterface,
    private readonly subscriptions: AnkifyNotionSubscriptionsRepositoryInterface,
    private readonly logs: AnkifySyncLogsRepositoryInterface,
    private readonly notionRepo: INotionRepository,
    private readonly ankiConnect: AnkiConnectFactory,
    private readonly notionUpdater: NotionPageUpdateClientFactory
  ) {}

  async execute(input: ResolveConflictInput): Promise<void> {
    const conflict = await this.conflicts.findById(input.id, input.owner);
    if (conflict?.status !== 'pending') {
      throw new ConflictNotFoundError();
    }

    if (input.resolution === 'dismissed' || input.resolution == null) {
      await this.conflicts.resolve(input.id, input.owner, 'dismissed');
      await this.recordLog(input.owner, 'dismissed', conflict.source_id);
      return;
    }

    const client = await this.clients.findActiveByOwner(input.owner);
    if (client == null) {
      throw new ConflictNotFoundError();
    }
    const ac = this.ankiConnect(
      input.ankiConnectHost ?? 'localhost',
      client.anki_port,
      client.anki_connect_api_key
    );

    const notionSnapshot = conflict.notion_snapshot as {
      front?: string;
      back?: string;
    } | null;
    const ankiSnapshot = conflict.anki_snapshot as {
      front?: string;
      back?: string;
    } | null;

    if (input.resolution === 'keep_notion') {
      await ac.updateNoteFields(conflict.anki_note_id, {
        Front: notionSnapshot?.front ?? '',
        Back: notionSnapshot?.back ?? '',
      });
      await ac.sync().catch(() => undefined);
    } else if (input.resolution === 'keep_anki') {
      const token = await this.notionRepo.getNotionToken(String(input.owner));
      if (token == null) {
        throw new NotionNotConnectedError();
      }
      const updater = this.notionUpdater(token);
      await updater.updateBlockContent(conflict.source_id, {
        front: ankiSnapshot?.front ?? '',
        back: ankiSnapshot?.back ?? '',
      });
    }

    const subscription =
      conflict.subscription_id == null
        ? null
        : await this.subscriptions.findById(
            conflict.subscription_id,
            input.owner
          );

    await this.mappings.upsert({
      ankify_client_id: client.id,
      source_id: conflict.source_id,
      source_type: 'notion_block',
      anki_note_id: conflict.anki_note_id,
      deck_name: buildDeckName(
        subscription?.target_deck ?? null,
        subscription?.notion_page_title ?? null
      ),
    });

    await this.conflicts.resolve(input.id, input.owner, input.resolution);
    await this.recordLog(input.owner, input.resolution, conflict.source_id);
  }

  private async recordLog(
    owner: number,
    resolution: string,
    sourceId: string
  ): Promise<void> {
    await this.logs
      .log({
        owner,
        kind: 'dispatch',
        status: 'info',
        message: `conflict ${resolution} for source ${sourceId}`,
      })
      .catch(() => undefined);
  }
}
