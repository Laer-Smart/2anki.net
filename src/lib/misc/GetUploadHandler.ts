import express from 'express';
import multer from 'multer';
import { getUploadLimits } from './getUploadLimits';
import { getMaxUploadCount } from './getMaxUploadCount';
import { isPaying } from '../isPaying';
import { decodeMultipartFilename } from './decodeMultipartFilename';

type UploadHandler = (
  req: express.Request,
  res: express.Response,
  callback: (error?: Error) => void
) => void;

function withNormalizedFilenames(handler: express.RequestHandler): UploadHandler {
  return (req, res, callback) => {
    handler(req, res, (error?: unknown) => {
      if (error instanceof Error) {
        callback(error);
        return;
      }
      const files = req.files as Express.Multer.File[] | undefined;
      if (files) {
        for (const file of files) {
          file.originalname = decodeMultipartFilename(file.originalname);
        }
      }
      if (req.file) {
        req.file.originalname = decodeMultipartFilename(req.file.originalname);
      }
      callback();
    });
  };
}

export const getUploadHandler = (res: express.Response): UploadHandler => {
  const paying = isPaying(res.locals);
  const maxUploadCount = getMaxUploadCount(paying);

  const handler = multer({
    limits: getUploadLimits(paying),
    dest: process.env.UPLOAD_BASE,
  }).array('pakker', maxUploadCount);

  return withNormalizedFilenames(handler);
};
