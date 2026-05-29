import express from 'express';
import fs from 'node:fs';

import { isPaying } from '../lib/isPaying';
import { getUploadValidationError } from '../lib/upload/getUploadValidationError';
import { isAnkiDeckFile } from '../lib/storage/checks';
import { UploadedFile } from '../lib/storage/types';
import {
  TransformApkgUseCase,
  UNKNOWN_MODEL_ERROR,
  EMPTY_DECK_ERROR,
} from '../usecases/ankify/TransformApkgUseCase';
import { parseApkgNotes } from '../services/ApkgPreviewService/parseApkgNotes';
import {
  IMAGE_SOURCES,
  ImageSource,
  isTargetLanguage,
  isTransformName,
} from '../lib/ankify/transforms/types';

const PAYWALL_RESPONSE = {
  code: 'paywall',
  message: 'Transform is on the paid plan. Upgrade to transform existing decks.',
};

function readUploaded(file: UploadedFile | undefined): Buffer | null {
  if (!file) return null;
  if (file.buffer && file.buffer.length > 0) return file.buffer;
  if (file.path) return fs.readFileSync(file.path);
  return null;
}

export class TransformController {
  constructor(private readonly useCase: TransformApkgUseCase) {}

  async preview(req: express.Request, res: express.Response): Promise<void> {
    if (!isPaying(res.locals)) {
      res.status(402).json(PAYWALL_RESPONSE);
      return;
    }
    const files = req.files as UploadedFile[] | undefined;
    const file = files?.[0];
    if (!file || !isAnkiDeckFile(file.originalname)) {
      res.status(400).json({ error: 'apkg_required' });
      return;
    }
    const bytes = readUploaded(file);
    if (!bytes) {
      res.status(400).json({ error: 'unreadable_file' });
      return;
    }
    try {
      const parsed = await parseApkgNotes(bytes);
      const firstNote = parsed.notes[0];
      res.status(200).json({
        deckName: parsed.deckName,
        noteCount: parsed.notes.length,
        unknownModelNames: parsed.unknownModelNames,
        modelName: firstNote?.modelName ?? null,
        fieldNames: firstNote?.fieldNames ?? [],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[transform] preview failed', { message });
      res.status(400).json({ error: 'parse_failed' });
    }
  }

  async transform(req: express.Request, res: express.Response): Promise<void> {
    if (!isPaying(res.locals)) {
      res.status(402).json(PAYWALL_RESPONSE);
      return;
    }

    const files = req.files as UploadedFile[] | undefined;
    const validationError = getUploadValidationError(files, { allowApkg: true });
    if (validationError) {
      res.status(400).contentType('text/plain').send(validationError.message);
      return;
    }

    const file = files?.[0];
    if (!file || !isAnkiDeckFile(file.originalname)) {
      res.status(400).contentType('text/plain').send('Upload a .apkg deck to transform.');
      return;
    }

    const body = req.body as Record<string, unknown>;
    const transform = body.transform;
    if (!isTransformName(transform)) {
      res.status(400).contentType('text/plain').send('Pick a transform.');
      return;
    }

    const targetLanguageRaw = body.targetLanguage;
    const targetLanguage =
      transform === 'translate_back'
        ? targetLanguageRaw
        : undefined;
    if (transform === 'translate_back' && !isTargetLanguage(targetLanguageRaw)) {
      res
        .status(400)
        .contentType('text/plain')
        .send('Pick a target language for the translation.');
      return;
    }

    let imageSource: ImageSource | undefined;
    if (transform === 'add_image') {
      const raw = body.imageSource;
      if (
        typeof raw === 'string' &&
        (IMAGE_SOURCES as readonly string[]).includes(raw)
      ) {
        imageSource = raw as ImageSource;
      } else {
        imageSource = 'pexels';
      }
    }

    const parseFieldIndex = (raw: unknown): number | undefined => {
      if (raw == null || raw === '') return undefined;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0 || n > 100) return undefined;
      return n;
    };
    const sourceField = parseFieldIndex(body.sourceField);
    const targetField = parseFieldIndex(body.targetField);
    const selection =
      sourceField != null || targetField != null
        ? { sourceField, targetField }
        : undefined;

    const bytes = readUploaded(file);
    if (!bytes) {
      res.status(400).contentType('text/plain').send('Could not read the uploaded file.');
      return;
    }

    try {
      const result = await this.useCase.execute({
        bytes,
        transform,
        targetLanguage: targetLanguage as never,
        imageSource,
        pexelsApiKey: process.env.PEXELS_API_KEY,
        selection,
      });
      res.set('Content-Type', 'application/apkg');
      res.set('Content-Length', Buffer.byteLength(result.apkg).toString());
      res.set('X-Card-Count', String(result.noteCount));
      res.set('X-Transform-Failed-Count', String(result.failedCount));
      res.set('Access-Control-Expose-Headers', 'File-Name, X-Card-Count, X-Transform-Failed-Count');
      const outName = `${result.deckName.replace(/[^\w. -]/g, '_')}-transformed.apkg`;
      try {
        res.set('File-Name', encodeURIComponent(outName));
      } catch {
        // best-effort header; the body is the truth
      }
      res.attachment(`/${outName}`);
      res.status(200).send(result.apkg);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === UNKNOWN_MODEL_ERROR || message === EMPTY_DECK_ERROR) {
        res.status(400).contentType('text/plain').send(message);
        return;
      }
      console.error('[transform] failed', { message });
      res.status(500).contentType('text/plain').send('Transform failed. Please try again.');
    }
  }
}

export default TransformController;
