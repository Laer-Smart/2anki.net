import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkifyNotionSubscriptionsRepositoryInterface } from '../../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import { AnkiConnectNoteFields } from '../../services/ankify/AnkiConnectClient';
import { AnkiConnectFactory } from './GetAnkifyStatsUseCase';
import { resolveOwnedLeechClient } from './leechClient';

export interface EditLeechNoteInput {
  owner: number;
  noteId: number;
  fields: AnkiConnectNoteFields;
  ankiConnectHost?: string;
}

export class EditLeechNoteUseCase {
  constructor(
    private readonly clients: AnkifyClientsRepositoryInterface,
    private readonly subscriptions: AnkifyNotionSubscriptionsRepositoryInterface,
    private readonly ankiConnect: AnkiConnectFactory
  ) {}

  async execute(input: EditLeechNoteInput): Promise<void> {
    const { ac } = await resolveOwnedLeechClient(
      this.clients,
      this.subscriptions,
      this.ankiConnect,
      input
    );
    await ac.updateNoteFields(input.noteId, input.fields);
  }
}
