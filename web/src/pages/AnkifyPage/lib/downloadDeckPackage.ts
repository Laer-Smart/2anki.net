const FILENAME_DISALLOWED = /[^\w.-]+/g;

export const apkgFilenameForDeck = (deck: string): string => {
  const lastSegment = deck.split('::').pop() ?? deck;
  const cleaned = lastSegment.trim().replace(FILENAME_DISALLOWED, '_');
  const trimmed = cleaned.replace(/^_+|_+$/g, '');
  const base = trimmed.length > 0 ? trimmed : 'deck';
  return `${base}.apkg`;
};

export const triggerBlobDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const downloadDeckPackage = (blob: Blob, deck: string): void => {
  triggerBlobDownload(blob, apkgFilenameForDeck(deck));
};
