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
  DeckTooLargeError,
} from '../usecases/ankify/TransformApkgUseCase';
import { parseApkgNotes } from '../services/ApkgPreviewService/parseApkgNotes';
import {
  FieldSelection,
  IMAGE_SOURCES,
  ImageSource,
  TransformName,
  isTargetLanguage,
  isTransformName,
} from '../lib/ankify/transforms/types';
import { getTransformNoteCap } from '../lib/ankify/transforms/limits';

const PAYWALL_RESPONSE = {
  code: 'paywall',
  message:
    'Transform is on the paid plan — translate, cloze, hint, or illustrate every card in a deck you already have.',
};

function readUploaded(file: UploadedFile | undefined): Buffer | null {
  if (!file) return null;
  if (file.buffer && file.buffer.length > 0) return file.buffer;
  if (file.path) return fs.readFileSync(file.path);
  return null;
}

interface TransformRequestParts {
  transform: TransformName;
  targetLanguage?: string;
  imageSource?: ImageSource;
  imageCount?: number;
  selection?: FieldSelection;
}

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

function parseTransformBody(
  body: Record<string, unknown>
): ParseResult<TransformRequestParts> {
  const transform = body.transform;
  if (!isTransformName(transform)) {
    return { ok: false, error: 'Pick a transform.' };
  }

  let targetLanguage: string | undefined;
  if (transform === 'translate_back') {
    if (!isTargetLanguage(body.targetLanguage)) {
      return {
        ok: false,
        error: 'Pick a target language for the translation.',
      };
    }
    targetLanguage = body.targetLanguage;
  }

  const image = transform === 'add_image' ? parseImageOptions(body) : {};
  const selection = parseFieldSelection(body);

  return {
    ok: true,
    value: { transform, targetLanguage, ...image, selection },
  };
}

function parseImageOptions(body: Record<string, unknown>): {
  imageSource: ImageSource;
  imageCount: number;
} {
  const rawSource = body.imageSource;
  const imageSource: ImageSource =
    typeof rawSource === 'string' &&
    (IMAGE_SOURCES as readonly string[]).includes(rawSource)
      ? (rawSource as ImageSource)
      : 'pexels';
  const rawCount = Number(body.imageCount);
  const imageCount =
    Number.isInteger(rawCount) && rawCount >= 1 && rawCount <= 5 ? rawCount : 1;
  return { imageSource, imageCount };
}

function parseFieldIndex(raw: unknown): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 100) return undefined;
  return n;
}

function parseFieldSelection(
  body: Record<string, unknown>
): FieldSelection | undefined {
  const sourceField = parseFieldIndex(body.sourceField);
  const targetField = parseFieldIndex(body.targetField);
  if (sourceField == null && targetField == null) return undefined;
  return { sourceField, targetField };
}

function trySetFileNameHeader(res: express.Response, outName: string): void {
  try {
    res.set('File-Name', encodeURIComponent(outName));
  } catch {
    // best-effort header; the body is the truth
  }
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
        noteCap: getTransformNoteCap(true),
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
      res
        .status(400)
        .contentType('text/plain')
        .send('Upload a .apkg deck to transform.');
      return;
    }

    const parts = parseTransformBody(req.body as Record<string, unknown>);
    if (!parts.ok) {
      res.status(400).contentType('text/plain').send(parts.error);
      return;
    }

    const bytes = readUploaded(file);
    if (!bytes) {
      res
        .status(400)
        .contentType('text/plain')
        .send('Could not read the uploaded file.');
      return;
    }

    try {
      const result = await this.useCase.execute({
        bytes,
        transform: parts.value.transform,
        targetLanguage: parts.value.targetLanguage as never,
        imageSource: parts.value.imageSource,
        imageCount: parts.value.imageCount,
        pexelsApiKey: process.env.PEXELS_API_KEY,
        selection: parts.value.selection,
        noteCap: getTransformNoteCap(true),
      });
      res.set('Content-Type', 'application/apkg');
      res.set('Content-Length', Buffer.byteLength(result.apkg).toString());
      res.set('X-Card-Count', String(result.noteCount));
      res.set('X-Transform-Failed-Count', String(result.failedCount));
      res.set(
        'Access-Control-Expose-Headers',
        'File-Name, X-Card-Count, X-Transform-Failed-Count'
      );
      const outName = `${result.deckName.replace(/[^\w. -]/g, '_')}-transformed.apkg`;
      trySetFileNameHeader(res, outName);
      res.attachment(`/${outName}`);
      res.status(200).send(result.apkg);
    } catch (err) {
      if (err instanceof DeckTooLargeError) {
        res
          .status(413)
          .contentType('text/plain')
          .send(
            `${err.noteCount} notes — over the ${err.noteCap}-per-job limit. Split the deck and run it in batches. Larger decks are coming.`
          );
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      if (message === UNKNOWN_MODEL_ERROR || message === EMPTY_DECK_ERROR) {
        res.status(400).contentType('text/plain').send(message);
        return;
      }
      console.error('[transform] failed', { message });
      res
        .status(500)
        .contentType('text/plain')
        .send('Transform failed. Please try again.');
    }
  }
}

export default TransformController;
