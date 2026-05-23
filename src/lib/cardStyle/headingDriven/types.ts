export type InputFormat = 'markdown' | 'html' | 'notion-html';

export interface Heading {
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  body: string;
}

export interface ChunkPayload {
  anchor: string;
  bodyChunk: string;
}
