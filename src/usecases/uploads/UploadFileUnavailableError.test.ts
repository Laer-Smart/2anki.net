import { UploadFileUnavailableError } from './UploadFileUnavailableError';

describe('UploadFileUnavailableError', () => {
  it('is an Error with the expected name and a clear message', () => {
    const err = new UploadFileUnavailableError('lecture.zip');

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('UploadFileUnavailableError');
    expect(err.message).toBe(
      'Uploaded file is no longer available — the upload did not finish.'
    );
  });

  it('carries the originating filename', () => {
    const err = new UploadFileUnavailableError('notes.html');

    expect(err.filename).toBe('notes.html');
  });
});
