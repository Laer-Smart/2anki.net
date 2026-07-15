import { isImageFile } from '../storage/checks';

interface NamedUpload {
  originalname?: string;
}

export function isImageOnlyUpload(files: NamedUpload[] | undefined): boolean {
  if (files == null || files.length === 0) {
    return false;
  }
  return files.every((file) => {
    const name = file.originalname;
    return typeof name === 'string' && Boolean(isImageFile(name));
  });
}
