import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkiConnectUnreachableError } from '../../services/ankify/AnkiConnectClient';
import { AnkiConnectFactory } from './GetAnkifyStatsUseCase';

export const COLLECTION_STATS_HTML_MAX_BYTES = 2_000_000;

export interface CollectionStatsHtmlOffline {
  connected: false;
}

export interface CollectionStatsHtmlConnected {
  connected: true;
  html: string;
  truncated: boolean;
}

export type CollectionStatsHtmlResult =
  | CollectionStatsHtmlOffline
  | CollectionStatsHtmlConnected;

export class GetCollectionStatsHtmlUseCase {
  constructor(
    private readonly clients: AnkifyClientsRepositoryInterface,
    private readonly ankiConnect: AnkiConnectFactory
  ) {}

  async execute(
    owner: number,
    options: { ankiConnectHost?: string } = {}
  ): Promise<CollectionStatsHtmlResult> {
    const client = await this.clients.findActiveByOwner(owner);
    if (client == null) {
      return { connected: false };
    }

    const ac = this.ankiConnect(
      options.ankiConnectHost ?? 'localhost',
      client.anki_port,
      client.anki_connect_api_key
    );

    try {
      await ac.ping();
    } catch (error) {
      if (error instanceof AnkiConnectUnreachableError) {
        return { connected: false };
      }
      throw error;
    }

    const rawHtml = await ac.getCollectionStatsHTML(true);
    const truncated =
      Buffer.byteLength(rawHtml, 'utf8') > COLLECTION_STATS_HTML_MAX_BYTES;
    const html = truncated
      ? rawHtml.slice(0, COLLECTION_STATS_HTML_MAX_BYTES)
      : rawHtml;
    return { connected: true, html, truncated };
  }
}
