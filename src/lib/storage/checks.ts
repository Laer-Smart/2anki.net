export const isMarkdownFile = (fileName: string) => /.md$/i.exec(fileName);

export const isHTMLFile = (fileName: string) => /.html$/i.exec(fileName);
export const isPotentiallyHTMLFile = (fileName: string) =>
  isHTMLFile(fileName) || fileName.toLowerCase().endsWith('.htm');

export const isZIPFile = (fileName: string) => /.zip$/i.exec(fileName);

export const isPlainText = (fileName: string) => /\.txt$/i.exec(fileName);

export function hasMarkdownFileName(fileNames: string[]) {
  return fileNames.some(isMarkdownFile);
}

export const isSoundCloudURL = (url: string) => /soundcloud\.com/.exec(url);

export const isTwitterURL = (url: string) => /twitter\.com/.exec(url);

export const isVimeoURL = (url: string) => /vimeo\.com/.exec(url);

export const isImageFileEmbedable = (url: string) => {
  const isLocalPath = !url.startsWith('http') && !url.startsWith('data:image');
  const hasTraversal = url.includes('../') || url.includes('..\\');
  return isLocalPath && !hasTraversal;
};

export const isCSVFile = (fileName: string) => /.csv$/i.exec(fileName);

export const isDocxFile = (fileName: string) => /\.(docx|doc)$/i.exec(fileName);

export const isPDFFile = (fileName: string) => /.pdf$/i.exec(fileName);

export const isPPTFile = (fileName: string) => /\.(ppt|pptx)$/i.exec(fileName);

/**
 * Checks if a file is a compressed file based on its extension or naming pattern.
 * This includes .zip files, .z files (Unix compress format), temporary downloads,
 * and files without a proper extension.
 * @param filename
 * @returns boolean indicating if the file is likely a compressed file
 */
export const isCompressedFile = (
  filename: string | null | undefined
): boolean => {
  if (!filename) {
    return false;
  }
  const lowerCaseFilename = filename.toLowerCase();
  if (
    lowerCaseFilename.endsWith('.crdownload') ||
    lowerCaseFilename.endsWith('.tmp') ||
    lowerCaseFilename.endsWith('.zip') ||
    lowerCaseFilename.endsWith('.z')
  ) {
    return true;
  }
  return filename.trim().endsWith('.') || !filename.includes('.');
};

// Maintain backward compatibility
export const isPotentialZipFile = isCompressedFile;

export const isImageFile = (name: string) =>
  isImageFileEmbedable(name) &&
  (name.toLowerCase().endsWith('.png') ||
    name.toLowerCase().endsWith('.jpg') ||
    name.toLowerCase().endsWith('.jpeg') ||
    name.toLowerCase().endsWith('.gif') ||
    name.toLowerCase().endsWith('.bmp') ||
    name.toLowerCase().endsWith('.svg'));

export const isXLSXFile = (fileName: string) => /.xlsx$/i.test(fileName);

export const isOpmlFile = (fileName: string) => /\.opml$/i.test(fileName);

export const isBrainstormsJsonFile = (fileName: string) =>
  /\.brainstorms\.json$/i.test(fileName);

export const isHiddenFileOrDirectory = (fileName: string) =>
  fileName.startsWith('.') ||
  fileName.endsWith('/') ||
  fileName.startsWith('__MACOSX');
