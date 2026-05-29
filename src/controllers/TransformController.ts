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
import {
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
