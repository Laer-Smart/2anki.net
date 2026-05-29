import { buildImageQuery, fetchImage } from './imageFetchService';
import {
  TransformApkgOutput,
  TransformMediaFile,
} from './transformService';
import {
  ImageSource,
  ParsedNote,
  TransformedNote,
} from '../../lib/ankify/transforms/types';

const DEFAULT_CONCURRENCY = 3;

export interface ImageTransformInput {
  notes: ParsedNote[];
  source: ImageSource;
  pexelsApiKey?: string;
  concurrency?: number;
}

async function mapWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  const size = concurrency > 0 ? concurrency : 1;
  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    await Promise.all(slice.map((item, j) => worker(item, i + j)));
  }
}

const appendImageToBack = (
  note: ParsedNote,
  filename: string
): TransformedNote => ({
  guid: note.guid,
  modelKind: note.modelKind,
  front: note.front,
  back:
    note.back.length > 0
      ? `${note.back}<br><img src="${filename}">`
      : `<img src="${filename}">`,
  tags: note.tags,
  media: [filename],
});

const passthrough = (note: ParsedNote): TransformedNote => ({
  guid: note.guid,
  modelKind: note.modelKind,
  front: note.front,
  back: note.back,
  tags: note.tags,
});

export async function transformApkgWithImages(
  input: ImageTransformInput
): Promise<TransformApkgOutput> {
  const concurrency = input.concurrency ?? DEFAULT_CONCURRENCY;
  const t0 = Date.now();

  const results: TransformedNote[] = new Array(input.notes.length);
  const media: TransformMediaFile[] = [];
  const seenFilenames = new Set<string>();
  const failures: Array<{ guid: string; reason: string }> = [];
  let imagesFound = 0;
  let imagesMissed = 0;

  await mapWithConcurrency(input.notes, concurrency, async (note, index) => {
    const query = buildImageQuery(note.front);
    if (query.length === 0) {
      results[index] = passthrough(note);
      imagesMissed += 1;
      return;
    }
    try {
      const hit = await fetchImage(query, input.source, {
        pexelsApiKey: input.pexelsApiKey,
      });
      if (hit == null) {
        results[index] = passthrough(note);
        imagesMissed += 1;
        return;
      }
      if (!seenFilenames.has(hit.filename)) {
        seenFilenames.add(hit.filename);
        media.push({ filename: hit.filename, bytes: hit.bytes });
      }
      results[index] = appendImageToBack(note, hit.filename);
      imagesFound += 1;
    } catch (err) {
      results[index] = passthrough(note);
      const reason = err instanceof Error ? err.message : String(err);
      failures.push({ guid: note.guid, reason });
    }
  });

  const elapsedMs = Date.now() - t0;

  console.info('[transform] image job complete', {
    source: input.source,
    notesIn: input.notes.length,
    imagesFound,
    imagesMissed,
    failures: failures.length,
    elapsedMs,
    concurrency,
  });

  return {
    notes: results,
    failures,
    media,
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      totalCalls: input.notes.length,
      elapsedMs,
    },
  };
}
