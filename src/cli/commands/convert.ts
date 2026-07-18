import fs from 'fs';
import path from 'path';
import { readConfig } from '../config';
import { ApiClient, ApiError } from '../apiClient';
import { info, success, error, warn, ui } from '../ui';

function ensureApkg(name: string): string {
  const base = path.basename(name);
  return base.endsWith('.apkg') ? base : `${base}.apkg`;
}

export async function convert(filePath: string | undefined): Promise<number> {
  if (filePath == null) {
    error('Usage: 2anki convert <file>');
    return 1;
  }
  const config = readConfig();
  if (config.apiKey == null) {
    warn('Not logged in. Run `2anki login` first.');
    return 1;
  }

  let bytes: Buffer;
  try {
    bytes = fs.readFileSync(filePath);
  } catch {
    error(`Could not read ${filePath}.`);
    return 1;
  }

  const filename = path.basename(filePath);
  const client = new ApiClient(config);

  info(`Converting ${ui.bold(filename)}…`);
  try {
    const result = await client.convert(filename, bytes);

    if (result.kind === 'single') {
      const out = ensureApkg(result.deckName);
      fs.writeFileSync(out, Buffer.from(result.bytes));
      success(
        `Deck ready: ${out}${result.cardCount > 0 ? ` (${result.cardCount} cards)` : ''}`
      );
      return 0;
    }

    if (result.decks.length === 0) {
      warn('No decks were produced from this file.');
      return 1;
    }
    for (const deck of result.decks) {
      const deckBytes = await client.downloadDeck(deck.downloadUrl);
      fs.writeFileSync(ensureApkg(deck.filename), Buffer.from(deckBytes));
    }
    success(
      `${result.decks.length} decks ready: ${result.decks
        .map((deck) => ensureApkg(deck.filename))
        .join(', ')}`
    );
    return 0;
  } catch (e) {
    error(e instanceof ApiError ? e.message : 'Conversion failed.');
    return 1;
  }
}
