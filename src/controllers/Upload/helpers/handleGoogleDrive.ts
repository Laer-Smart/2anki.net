import express from 'express';

import { isPaying } from '../../../lib/isPaying';
import { getUploadLimits } from '../../../lib/misc/getUploadLimits';
import { handleUploadLimitError } from './handleUploadLimitError';
import { getDatabase } from '../../../data_layer';
import { getOwner } from '../../../lib/User/getOwner';
import {
  GoogleDriveFile,
  GoogleDriveRepository,
} from '../../../data_layer/GoogleDriveRepository';
import { isEmptyUpload } from './isEmptyUpload';
import { getFilesOrEmpty } from './getFilesOrEmpty';
import {
  createGoogleDriveDownloadLink,
  createGoogleDriveExportLink,
  NATIVE_GOOGLE_APPS_EXPORT_MIMES,
} from './createGoogleDriveDownloadLink';
import instrumentedAxios from '../../../services/observability/instrumentedAxios';

function resolveUrlAndName(file: GoogleDriveFile): {
  url: string;
  originalname: string;
} {
  const exportSpec = NATIVE_GOOGLE_APPS_EXPORT_MIMES[file.mimeType];
  if (exportSpec) {
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return {
      url: createGoogleDriveExportLink(file, exportSpec.exportMime),
      originalname: baseName + exportSpec.extension,
    };
  }
  return {
    url: createGoogleDriveDownloadLink(file),
    originalname: file.name,
  };
}

export async function handleGoogleDrive(
  req: express.Request,
  res: express.Response,
  handleUpload: (req: express.Request, res: express.Response) => void
) {
  try {
    const files = getFilesOrEmpty<GoogleDriveFile>(req.body);
    if (isEmptyUpload(files)) {
      res.status(400).send('No Google Drive files selected, one is required.');
      return;
    }

    const googleDriveAuth = req.body.googleDriveAuth;
    if (
      googleDriveAuth === undefined ||
      googleDriveAuth === null ||
      googleDriveAuth === 'undefined' ||
      googleDriveAuth === 'null'
    ) {
      res.status(400).send('Google Drive authentication is missing.');
      return;
    }

    const paying = isPaying(res.locals);
    const limits = getUploadLimits(paying);
    const totalSize = files.reduce((acc, file) => acc + file.sizeBytes, 0);
    if (!paying && totalSize > limits.fileSize) {
      handleUploadLimitError(req, res, new Error('File too large'));
      return;
    }
    const repo = new GoogleDriveRepository(getDatabase());
    const owner = getOwner(res);
    if (owner) {
      await repo.saveFiles(files, owner);
    }

    // @ts-ignore — Express request does not declare files in its type
    req.files = await Promise.all(
      files.map(async (file) => {
        const { url, originalname } = resolveUrlAndName(file);
        const contents = await instrumentedAxios.get<ArrayBuffer>(
          'google_drive',
          url,
          {
            headers: {
              Authorization: `Bearer ${googleDriveAuth}`,
            },
            responseType: 'arraybuffer',
          }
        );
        const buffer = Buffer.from(contents.data);
        return {
          originalname,
          size: buffer.length,
          buffer,
        };
      })
    );
    handleUpload(req, res);
  } catch (error) {
    console.error('[handleGoogleDrive] failed:', error);
    res.status(400).send('Error handling Google Drive files');
  }
}
