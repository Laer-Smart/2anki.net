export default class TagRegistry {
  strikethroughs: string[];

  constructor() {
    this.strikethroughs = [];
  }

  addStrikethrough(strikethrough: string): void {
    this.strikethroughs.push(strikethrough);
  }

  clear(): void {
    this.strikethroughs = [];
  }
}
