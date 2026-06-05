import express from 'express';

import {
  DropboxFile,
  DropboxRepository,
} from '../../../data_layer/DropboxRepository';
import instrumentedAxios from '../../../services/observability/instrumentedAxios';
import { isPaying } from '../../../lib/isPaying';
import { getUploadLimits } from '../../../lib/misc/getUploadLimits';
import { handleUploadLimitError } from './handleUploadLimitError';
import { getDatabase } from '../../../data_layer';
import { getOwner } from '../../../lib/User/getOwner';
import { isEmptyUpload } from './isEmptyUpload';
import { getFilesOrEmpty } from './getFilesOrEmpty';

export async function handleDropbox(
  req: express.Request,
  res: express.Response,
  handleUpload: (req: express.Request, res: express.Response) => void
) {
  try {
    const files = getFilesOrEmpty<DropboxFile>(req.body);
    if (isEmptyUpload(files)) {
      console.debug('No dropbox files selected.');
      res
        .status(400)
        .json({ error: 'No dropbox files selected, one is required.' });
      return;
    }

    const paying = isPaying(res.locals);
    const limits = getUploadLimits(paying);
    const totalSize = files.reduce((acc, file) => acc + file.bytes, 0);
    if (!paying && totalSize > limits.fileSize) {
      handleUploadLimitError(req, res, new Error('File too large'));
      return;
    }
    const repo = new DropboxRepository(getDatabase());
    const owner = getOwner(res);
    if (owner) {
      await repo.saveFiles(files, owner);
    } else {
      console.log('Not storing anon users dropbox files');
    }
    // @ts-ignore
    req.files = await Promise.all(
      files.map(async (file) => {
        const contents = await instrumentedAxios.get<ArrayBuffer>(
          'dropbox',
          file.link,
          {
            responseType: 'arraybuffer',
          }
        );
        return {
          originalname: file.name,
          size: file.bytes,
          buffer: Buffer.from(contents.data),
        };
      })
    );
    handleUpload(req, res);
  } catch (error) {
    console.debug('Error handling dropbox files', error);
    res.status(400).json({ error: 'Error handling dropbox files' });
  }
}
