import { File } from '../../lib/zip/zip';
import { isImageFileEmbedable } from '../../lib/storage/checks';

export function getRelevantFiles(fileName: string, allFiles: File[]): File[] {
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const baseNameWithoutNotionId = baseName.replace(/ [0-9a-f]{32}$/, '');
  const isRootFile = !fileName.includes('/');

  return allFiles.filter(
    (f) =>
      f.name === fileName ||
      f.name.startsWith(baseName + '/') ||
      f.name.startsWith(baseNameWithoutNotionId + '/') ||
      (isRootFile && !f.name.includes('/') && isImageFileEmbedable(f.name))
  );
}
