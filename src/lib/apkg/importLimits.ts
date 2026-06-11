export const APKG_IMPORT_NOTE_CAP_PAID = 10000;
export const APKG_IMPORT_NOTE_CAP_FREE = 1000;

export function getApkgImportNoteCap(isPaying: boolean): number {
  return isPaying ? APKG_IMPORT_NOTE_CAP_PAID : APKG_IMPORT_NOTE_CAP_FREE;
}
