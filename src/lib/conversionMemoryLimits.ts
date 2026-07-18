// Piscina conversion workers run with a bounded V8 old-generation heap. Both the
// pool (which applies it via resourceLimits) and the zip extractor (which sizes
// its own in-memory / decompressed ceilings below it) need this number, so it
// lives in a dependency-free leaf module — importing conversionPool.ts into the
// extraction hot path would drag knex, Piscina, and the Notion client into it.
export const MAX_OLD_GENERATION_SIZE_MB = 1024;
