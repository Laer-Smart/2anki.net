import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkifyNotionSubscriptionsRepositoryInterface } from '../../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import { ownedDeckNames } from '../../lib/ankify/deckOwnership';
import { AnkiConnectClient } from '../../services/ankify/AnkiConnectClient';
import { assertNoteOwned } from './assertNoteOwned';
import { AnkiConnectFactory } from './GetAnkifyStatsUseCase';

export class NoActiveAnkifyClientForLeechError extends Error {
  constructor() {
    super('No active Ankify client');
    this.name = 'NoActiveAnkifyClientForLeechError';
  }
}

export interface OwnedLeechClient {
  ac: AnkiConnectClient;
}

export const resolveOwnedLeechClient = async (
  clients: AnkifyClientsRepositoryInterface,
  subscriptions: AnkifyNotionSubscriptionsRepositoryInterface,
  ankiConnect: AnkiConnectFactory,
  input: { owner: number; noteId: number; ankiConnectHost?: string }
): Promise<OwnedLeechClient> => {
  const owned = await subscriptions.listByOwner(input.owner);
  const decks = ownedDeckNames(owned);

  const client = await clients.findActiveByOwner(input.owner);
  if (client == null) {
    throw new NoActiveAnkifyClientForLeechError();
  }

  const ac = ankiConnect(
    input.ankiConnectHost ?? 'localhost',
    client.anki_port,
    client.anki_connect_api_key
  );

  await ac.ping();
  await assertNoteOwned(ac, decks, input.noteId);

  return { ac };
};
