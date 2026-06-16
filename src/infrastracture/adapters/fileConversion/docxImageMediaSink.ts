import fs from 'fs';

import getUniqueFileName from '../../../lib/misc/getUniqueFileName';
import { resolveSafeEntryPath } from '../../../lib/vocab/safeEntryPath';

const MAX_DOCX_IMAGE_BYTES = 25 * 1024 * 1024;

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/webp': 'webp',
  'image/tiff': 'tiff',
  'image/svg+xml': 'svg',
  'image/x-emf': 'emf',
  'image/x-wmf': 'wmf',
};

export function extensionForContentType(contentType: string): string {
  const normalized = contentType.trim().toLowerCase();
  return EXTENSION_BY_CONTENT_TYPE[normalized] ?? 'png';
}

export interface DocxImageMediaSink {
  write(bytes: Buffer, contentType: string): string;
}

export function createWorkspaceDocxImageMediaSink(
  workspaceLocation: string
): DocxImageMediaSink {
  return {
    write(bytes: Buffer, contentType: string): string {
      if (bytes.length === 0) {
        throw new Error('docx image is empty');
      }
      if (bytes.length > MAX_DOCX_IMAGE_BYTES) {
        throw new Error('docx image exceeds the size limit');
      }
      const fileName = `${getUniqueFileName(bytes.toString('binary'))}.${extensionForContentType(contentType)}`;
      const destination = resolveSafeEntryPath(fileName, workspaceLocation);
      fs.writeFileSync(destination, bytes);
      return fileName;
    },
  };
}
