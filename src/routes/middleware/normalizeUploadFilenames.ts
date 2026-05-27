import express from 'express';
import { decodeMultipartFilename } from '../../lib/misc/decodeMultipartFilename';

export function normalizeUploadFilenames(
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction
): void {
  if (req.files) {
    const files = req.files as Express.Multer.File[];
    for (const file of files) {
      file.originalname = decodeMultipartFilename(file.originalname);
    }
  }

  if (req.file) {
    req.file.originalname = decodeMultipartFilename(req.file.originalname);
  }

  next();
}
