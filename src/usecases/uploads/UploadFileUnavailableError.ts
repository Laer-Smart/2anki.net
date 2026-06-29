export class UploadFileUnavailableError extends Error {
  readonly filename: string;

  constructor(filename: string) {
    super('Uploaded file is no longer available — the upload did not finish.');
    this.name = 'UploadFileUnavailableError';
    this.filename = filename;
  }
}
