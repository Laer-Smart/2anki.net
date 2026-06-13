import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkifyNotionSubscriptionsRepositoryInterface } from '../../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import { AnkiConnectFactory } from './GetAnkifyStatsUseCase';
import { resolveOwnedLeechClient } from './leechClient';

export interface DeleteLeechNoteInput {
  owner: number;
  noteId: number;
  ankiConnectHost?: string;
}

export class DeleteLeechNoteUseCase {
  constructor(
    private readonly clients: AnkifyClientsRepositoryInterface,
    private readonly subscriptions: AnkifyNotionSubscriptionsRepositoryInterface,
    private readonly ankiConnect: AnkiConnectFactory
  ) {}

  async execute(input: DeleteLeechNoteInput): Promise<void> {
    const { ac } = await resolveOwnedLeechClient(
      this.clients,
      this.subscriptions,
      this.ankiConnect,
      input
    );
    await ac.deleteNotes([input.noteId]);
  }
}
