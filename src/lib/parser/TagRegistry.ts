export default class TagRegistry {
  strikethroughs: string[];

  // singleton instance
  private static _instance: TagRegistry;

  constructor() {
    this.strikethroughs = [];
  }

  static getInstance(): TagRegistry {
    if (!TagRegistry._instance) {
      TagRegistry._instance = new TagRegistry();
    }
    return TagRegistry._instance;
  }

  addStrikethrough(strikethrough: string): void {
    this.strikethroughs.push(strikethrough);
  }

  clear(): void {
    this.strikethroughs = [];
  }
}
