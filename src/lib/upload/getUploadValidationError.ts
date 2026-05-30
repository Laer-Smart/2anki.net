import { UploadedFile } from '../storage/types';
import { isAnkiDeckFile } from '../storage/checks';

interface ValidationOptions {
  allowApkg?: boolean;
}

function isEmptyFile(file: UploadedFile): boolean {
  return file.size === 0;
}

export function getUploadValidationError(
  files: UploadedFile[] | undefined | null,
  options: ValidationOptions = {}
): Error | null {
  if (!files || files.length === 0) {
    return new Error('Please select a file to upload.');
  }

  for (const file of files) {
    if (!file.originalname) {
      return new Error('The uploaded file appears to be invalid. Please try again.');
    }

    if (isEmptyFile(file)) {
      return new Error(
        `"${file.originalname}" appears to be empty. Please re-export your file and try again.`
      );
    }

    if (!options.allowApkg && isAnkiDeckFile(file.originalname)) {
      return new Error(
        `"${file.originalname}" is already an Anki deck. 2anki converts source files like Notion HTML exports, not existing decks.`
      );
    }
  }

  return null;
}
