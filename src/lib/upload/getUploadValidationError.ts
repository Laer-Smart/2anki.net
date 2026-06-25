import { UploadedFile } from '../storage/types';
import { isAnkiDeckFile, isPagesFile } from '../storage/checks';

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
      return new Error(
        'The uploaded file appears to be invalid. Please try again.'
      );
    }

    if (isEmptyFile(file)) {
      return new Error(
        `"${file.originalname}" appears to be empty. Please re-export your file and try again.`
      );
    }

    if (isPagesFile(file.originalname)) {
      return new Error(
        `We can't read Pages files. Open ${file.originalname} in Apple Pages, export it as PDF, Word (.docx), or HTML, then upload that.`
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
