import { AnkiConnectClient } from '../../services/ankify/AnkiConnectClient';
import { buildNoteOwnershipQuery } from './leechQueries';

export class NoteNotOwnedError extends Error {
  constructor() {
    super('Note does not belong to the requesting user');
    this.name = 'NoteNotOwnedError';
  }
}

export const assertNoteOwned = async (
  ac: AnkiConnectClient,
  ownedDeckNames: string[],
  noteId: number
): Promise<void> => {
  const query = buildNoteOwnershipQuery(noteId, ownedDeckNames);
  if (query == null) {
    throw new NoteNotOwnedError();
  }
  const matches = await ac.findNotes(query);
  if (matches.length === 0) {
    throw new NoteNotOwnedError();
  }
};
