import { randomUUID } from 'crypto';

import { AnkifyClient } from '../../entities/ankify';
import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkifyNotionSubscriptionsRepositoryInterface } from '../../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import { userOwnsDeck } from '../../lib/ankify/deckOwnership';
import { AnkiConnectClient } from '../../services/ankify/AnkiConnectClient';
import { AnkiConnectFactory } from './GetAnkifyStatsUseCase';
import { DeckNotOwnedError } from './OpenDeckInAnkiUseCase';

export class NoActiveAnkifyClientForExportError extends Error {
  constructor() {
    super('No active Ankify client');
    this.name = 'NoActiveAnkifyClientForExportError';
  }
}

export class DeckExportFailedError extends Error {
  constructor() {
    super('Anki could not export the deck');
    this.name = 'DeckExportFailedError';
  }
}

export interface ExportedDeckBytesReader {
  (
    client: AnkifyClient,
    containerPath: string
  ): Promise<{ bytes: Buffer; cleanup: () => Promise<void> }>;
}

export interface ExportDeckPackageInput {
  owner: number;
  deck: string;
  ankiConnectHost?: string;
}

export interface ExportDeckPackageResult {
  bytes: Buffer;
  deck: string;
}

const containerExportPath = (): string => `/data/${randomUUID()}.apkg`;

export class ExportDeckPackageUseCase {
  constructor(
    private readonly clients: AnkifyClientsRepositoryInterface,
    private readonly subscriptions: AnkifyNotionSubscriptionsRepositoryInterface,
    private readonly ankiConnect: AnkiConnectFactory,
    private readonly readExportedBytes: ExportedDeckBytesReader
  ) {}

  async execute(
    input: ExportDeckPackageInput
  ): Promise<ExportDeckPackageResult> {
    const owned = await this.subscriptions.listByOwner(input.owner);
    if (!userOwnsDeck(input.deck, owned)) {
      throw new DeckNotOwnedError();
    }

    const client = await this.clients.findActiveByOwner(input.owner);
    if (client == null) {
      throw new NoActiveAnkifyClientForExportError();
    }

    const ac: AnkiConnectClient = this.ankiConnect(
      input.ankiConnectHost ?? 'localhost',
      client.anki_port,
      client.anki_connect_api_key
    );

    await ac.ping();

    const containerPath = containerExportPath();
    const exported = await ac.exportPackage(input.deck, containerPath, false);
    if (!exported) {
      throw new DeckExportFailedError();
    }

    const { bytes, cleanup } = await this.readExportedBytes(
      client,
      containerPath
    );
    try {
      return { bytes, deck: input.deck };
    } finally {
      await cleanup();
    }
  }
}
