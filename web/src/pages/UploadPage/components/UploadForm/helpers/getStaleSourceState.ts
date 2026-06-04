import type { UploadSource } from '../UploadSourceChips';

export interface StaleSourceState {
  clearDrive: boolean;
  clearDropbox: boolean;
}

export function getStaleSourceState(next: UploadSource): StaleSourceState {
  return {
    clearDrive: next !== 'google_drive',
    clearDropbox: next !== 'dropbox',
  };
}
