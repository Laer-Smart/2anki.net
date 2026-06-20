// Jest stub for the metascraper factory. The real package (and its
// @metascraper/helpers dependency chain) ships ESM-only modules
// (condense-whitespace, mime) that the CommonJS jest transform can't parse.
// Tests never exercise real scraping — useMetadata.test.ts mocks the scraper
// directly — so this stub keeps the ESM chain out of the jest module graph.
const metascraper =
  (_plugins?: unknown[]) =>
  async (_options?: unknown): Promise<Record<string, unknown>> => ({});

export = metascraper;
