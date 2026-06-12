import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkifySyncConflictsRepositoryInterface } from '../../data_layer/ankify/AnkifySyncConflictsRepository';
import { AnkiConnectUnreachableError } from '../../services/ankify/AnkiConnectClient';
import { AnkiConnectFactory } from './SyncNotionPageToRacUseCase';

export class ConflictNotFoundForOpenError extends Error {
  constructor() {
    super('Conflict not found');
    this.name = 'ConflictNotFoundForOpenError';
  }
}

export interface OpenConflictInAnkiInput {
  id: number;
  owner: number;
  ankiConnectHost?: string;
}

export interface OpenConflictInAnkiResult {
  opened: boolean;
}

export class OpenConflictInAnkiUseCase {
  constructor(
    private readonly clients: AnkifyClientsRepositoryInterface,
    private readonly conflicts: AnkifySyncConflictsRepositoryInterface,
    private readonly ankiConnect: AnkiConnectFactory
  ) {}

  async execute(
    input: OpenConflictInAnkiInput
  ): Promise<OpenConflictInAnkiResult> {
    const conflict = await this.conflicts.findById(input.id, input.owner);
    if (conflict == null) {
      throw new ConflictNotFoundForOpenError();
    }
    if (!Number.isInteger(conflict.anki_note_id)) {
      throw new ConflictNotFoundForOpenError();
    }

    const client = await this.clients.findActiveByOwner(input.owner);
    if (client == null) {
      return { opened: false };
    }

    const ac = this.ankiConnect(
      input.ankiConnectHost ?? 'localhost',
      client.anki_port,
      client.anki_connect_api_key
    );

    try {
      await ac.ping();
    } catch (error) {
      if (error instanceof AnkiConnectUnreachableError) {
        return { opened: false };
      }
      throw error;
    }

    await ac.guiBrowse(`nid:${conflict.anki_note_id}`);
    return { opened: true };
  }
}
