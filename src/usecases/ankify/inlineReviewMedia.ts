type MediaFetcher = (filename: string) => Promise<string | false>;

const MAX_INLINE_MEDIA_FILES = 200;
const MAX_DECODED_BYTES = 5 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
};

const IMAGE_MISSING_CHIP =
  '<span class="n2a-review-missing">Image not in Anki</span>';
const AUDIO_MISSING_CHIP =
  '<span class="n2a-review-missing">Audio not in Anki</span>';

const isBareFilename = (src: string): boolean =>
  !/^(?:https?:|data:|\/)/i.test(src);

const mimeFor = (filename: string): string | null => {
  const dot = filename.lastIndexOf('.');
  if (dot < 0) {
    return null;
  }
  const ext = filename.slice(dot + 1).toLowerCase();
  return MIME_BY_EXTENSION[ext] ?? null;
};

const isOversized = (base64: string): boolean =>
  base64.length * 0.75 > MAX_DECODED_BYTES;

const resolveDataUri = async (
  filename: string,
  fetchMedia: MediaFetcher,
  cache: Map<string, string | null>
): Promise<string | null> => {
  if (cache.has(filename)) {
    return cache.get(filename) ?? null;
  }

  const mime = mimeFor(filename);
  if (mime == null) {
    cache.set(filename, null);
    return null;
  }

  if (cache.size >= MAX_INLINE_MEDIA_FILES) {
    return null;
  }

  const fetched = await fetchMedia(filename);
  if (fetched === false || fetched == null || isOversized(fetched)) {
    cache.set(filename, null);
    return null;
  }

  const dataUri = `data:${mime};base64,${fetched}`;
  cache.set(filename, dataUri);
  return dataUri;
};

const replaceImages = async (
  html: string,
  fetchMedia: MediaFetcher,
  cache: Map<string, string | null>
): Promise<string> => {
  const tags = [...html.matchAll(/<img\b[^>]*?>/gi)];
  let result = html;

  for (const match of tags) {
    const tag = match[0];
    const srcMatch = /\bsrc\s*=\s*["']([^"']*)["']/i.exec(tag);
    if (srcMatch == null || !isBareFilename(srcMatch[1])) {
      continue;
    }

    const srcAttr = srcMatch[0];
    const dataUri = await resolveDataUri(srcMatch[1], fetchMedia, cache);
    if (dataUri == null) {
      result = result.replace(tag, IMAGE_MISSING_CHIP);
      continue;
    }

    const rewritten = tag.replace(srcAttr, `src="${dataUri}"`);
    result = result.replace(tag, rewritten);
  }

  return result;
};

const replaceSounds = async (
  html: string,
  fetchMedia: MediaFetcher,
  cache: Map<string, string | null>
): Promise<string> => {
  const refs = [...html.matchAll(/\[sound:([^\]]+)\]/g)];
  let result = html;

  for (const match of refs) {
    const token = match[0];
    const filename = match[1];
    const dataUri = await resolveDataUri(filename, fetchMedia, cache);
    if (dataUri == null) {
      result = result.replace(token, AUDIO_MISSING_CHIP);
      continue;
    }

    result = result.replace(
      token,
      `<audio controls preload="none" src="${dataUri}"></audio>`
    );
  }

  return result;
};

export async function inlineReviewMedia(
  html: string,
  fetchMedia: MediaFetcher,
  cache: Map<string, string | null>
): Promise<string> {
  const withImages = await replaceImages(html, fetchMedia, cache);
  const withAudio = await replaceSounds(withImages, fetchMedia, cache);
  return withAudio.replace(/\[anki:play:[qa]:\d+\]/g, '');
}
