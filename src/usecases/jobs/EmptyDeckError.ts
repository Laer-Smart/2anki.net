export class EmptyDeckError extends Error {
  readonly sourceFormat: 'markdown' | undefined;

  constructor(sourceFormat?: 'markdown') {
    super('No cards found in your upload. Use .zip, .html, .md, or .csv.');
    this.name = 'EmptyDeckError';
    this.sourceFormat = sourceFormat;
  }
}
