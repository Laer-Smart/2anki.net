import { describe, it, expect } from 'vitest';
import { getStaleSourceState } from './getStaleSourceState';

describe('getStaleSourceState', () => {
  it('clears drive state when switching to local', () => {
    expect(getStaleSourceState('local')).toEqual({
      clearDrive: true,
      clearDropbox: true,
    });
  });

  it('clears drive state when switching to dropbox', () => {
    expect(getStaleSourceState('dropbox')).toEqual({
      clearDrive: true,
      clearDropbox: false,
    });
  });

  it('clears dropbox state when switching to google_drive', () => {
    expect(getStaleSourceState('google_drive')).toEqual({
      clearDrive: false,
      clearDropbox: true,
    });
  });
});
