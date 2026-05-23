export class EmptyDeckError extends Error {
  constructor() {
    super('No cards found in your upload. Use .zip, .html, .md, .csv, or .apkg.');
    this.name = 'EmptyDeckError';
  }
}
