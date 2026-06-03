import express from 'express';

import { getOwner } from '../../lib/User/getOwner';
import { BytesToMegaBytes } from '../../lib/misc/file';
import { SaveNativeDeckUseCase } from '../../usecases/uploads/SaveNativeDeckUseCase';

const APKG_EXTENSION = /\.apkg$/i;
const MAX_DECK_NAME_LENGTH = 200;

function resolveDeckFilename(rawName: unknown, originalName: string): string {
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  const base = name.length > 0 ? name : originalName;
  const safe = base.slice(0, MAX_DECK_NAME_LENGTH);
  if (APKG_EXTENSION.test(safe)) {
    return safe;
  }
  return `${safe}.apkg`;
}

function resolveDedupeKey(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed.slice(0, MAX_DECK_NAME_LENGTH) : null;
}

export class SaveNativeDeckController {
  constructor(private readonly useCase: SaveNativeDeckUseCase) {}

  async save(req: express.Request, res: express.Response): Promise<void> {
    const owner = getOwner(res) as number | undefined;
    if (owner == null) {
      res.status(401).json({ error: 'authentication required' });
      return;
    }

    const file = req.file;
    if (file == null) {
      res.status(400).json({ error: 'No deck file provided.' });
      return;
    }

    if (!APKG_EXTENSION.test(file.originalname)) {
      res.status(400).json({ error: 'Only .apkg decks can be saved.' });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const filename = resolveDeckFilename(body.name, file.originalname);
    const dedupeKey = resolveDedupeKey(body.dedupe_key);
    const sizeMb = BytesToMegaBytes(file.size);

    const saved = await this.useCase.execute({
      owner,
      filename,
      apkg: file.buffer,
      sizeMb,
      dedupeKey,
    });

    res.status(200).json({
      key: saved.key,
      filename: saved.filename,
      size_mb: saved.size_mb,
    });
  }
}
