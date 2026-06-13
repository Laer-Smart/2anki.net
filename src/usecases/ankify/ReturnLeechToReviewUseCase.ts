import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkifyNotionSubscriptionsRepositoryInterface } from '../../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import { AnkiConnectFactory } from './GetAnkifyStatsUseCase';
import { resolveOwnedLeechClient } from './leechClient';

const LEECH_TAG = 'leech';

export interface ReturnLeechToReviewInput {
  owner: number;
  noteId: number;
  ankiConnectHost?: string;
}

export interface ReturnLeechToReviewResult {
  noteId: number;
  unsuspended: boolean;
  tagRemoved: true;
}

export class ReturnLeechToReviewUseCase {
  constructor(
    private readonly clients: AnkifyClientsRepositoryInterface,
    private readonly subscriptions: AnkifyNotionSubscriptionsRepositoryInterface,
    private readonly ankiConnect: AnkiConnectFactory
  ) {}

  async execute(
    input: ReturnLeechToReviewInput
  ): Promise<ReturnLeechToReviewResult> {
    const { ac } = await resolveOwnedLeechClient(
      this.clients,
      this.subscriptions,
      this.ankiConnect,
      input
    );

    const notes = await ac.notesInfo([input.noteId]);
    const cards = notes.flatMap((note) => note.cards ?? []);
    const unsuspended = cards.length > 0 ? await ac.unsuspend(cards) : false;
    await ac.removeTags([input.noteId], LEECH_TAG);

    return { noteId: input.noteId, unsuspended, tagRemoved: true };
  }
}
