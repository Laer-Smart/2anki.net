import crypto from 'node:crypto';

import instrumentedAxios from '../observability/instrumentedAxios';
import { ImageSource } from '../../lib/ankify/transforms/types';

export interface ImageHit {
  bytes: Buffer;
  filename: string;
  mimeType: string;
  attribution: string;
}

const PEXELS_SEARCH_URL = 'https://api.pexels.com/v1/search';
const WIKIPEDIA_API_URL = 'https://en.wikipedia.org/w/api.php';

const EXT_FOR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

const extensionForMime = (mime: string): string => {
  const lower = mime.toLowerCase();
  return EXT_FOR_MIME[lower] ?? 'jpg';
};

const filenameFromUrl = (url: string, mime: string): string => {
  const hash = crypto.createHash('sha256').update(url).digest('hex').slice(0, 16);
  return `2anki-${hash}.${extensionForMime(mime)}`;
};

const stripPunctuation = (value: string): string =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const buildImageQuery = (front: string): string =>
  stripPunctuation(front).slice(0, 100);

interface PexelsSearchResponse {
  photos?: Array<{
    src?: { medium?: string; large?: string };
    photographer?: string;
    url?: string;
  }>;
}

interface WikipediaPageImagesResponse {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        thumbnail?: { source?: string; width?: number; height?: number };
        original?: { source?: string };
      }
    >;
  };
}

const downloadImage = async (
  source: ImageSource,
  url: string
): Promise<{ bytes: Buffer; mime: string } | undefined> => {
  try {
    const response = await instrumentedAxios.get<ArrayBuffer>(source, url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': '2anki/1.0 (https://2anki.net; support@2anki.net)',
        Accept: 'image/*',
      },
    });
    const mime =
      typeof response.headers['content-type'] === 'string'
        ? response.headers['content-type'].split(';')[0].trim()
        : 'image/jpeg';
    return { bytes: Buffer.from(response.data), mime };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn('[transform] image download error', { source, url, reason });
    return undefined;
  }
};

const fetchFromPexels = async (
  query: string,
  apiKey: string,
  count: number
): Promise<ImageHit[]> => {
  let searchPayload: PexelsSearchResponse;
  try {
    const response = await instrumentedAxios.get<PexelsSearchResponse>(
      'pexels',
      PEXELS_SEARCH_URL,
      {
        params: { query, per_page: count, orientation: 'landscape' },
        headers: { Authorization: apiKey },
        timeout: 5000,
      }
    );
    searchPayload = response.data;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn('[transform] pexels search failed', { query, reason });
    return [];
  }

  const photos = searchPayload.photos ?? [];
  const hits: ImageHit[] = [];
  for (const photo of photos) {
    const imageUrl = photo?.src?.medium ?? photo?.src?.large;
    if (imageUrl == null) continue;
    const downloaded = await downloadImage('pexels', imageUrl);
    if (downloaded == null) continue;
    const photographer = photo?.photographer ?? 'Pexels';
    hits.push({
      bytes: downloaded.bytes,
      filename: filenameFromUrl(imageUrl, downloaded.mime),
      mimeType: downloaded.mime,
      attribution: `Photo by ${photographer} on Pexels`,
    });
    if (hits.length >= count) break;
  }
  return hits;
};

const fetchFromWikimedia = async (
  query: string,
  count: number
): Promise<ImageHit[]> => {
  let searchPayload: WikipediaPageImagesResponse;
  try {
    const response = await instrumentedAxios.get<WikipediaPageImagesResponse>(
      'wikimedia',
      WIKIPEDIA_API_URL,
      {
        params: {
          action: 'query',
          format: 'json',
          generator: 'search',
          gsrsearch: query,
          gsrlimit: count,
          prop: 'pageimages',
          piprop: 'thumbnail|original',
          pithumbsize: 800,
          origin: '*',
        },
        headers: {
          'User-Agent': '2anki/1.0 (https://2anki.net; support@2anki.net)',
        },
        timeout: 5000,
      }
    );
    searchPayload = response.data;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn('[transform] wikipedia search failed', { query, reason });
    return [];
  }

  const pages = searchPayload.query?.pages;
  if (pages == null) {
    console.info('[transform] wikipedia no pages', {
      query,
      payload: JSON.stringify(searchPayload).slice(0, 240),
    });
    return [];
  }

  const hits: ImageHit[] = [];
  const sortedPages = Object.values(pages).sort((a, b) => {
    const ai = (a as unknown as { index?: number }).index ?? 0;
    const bi = (b as unknown as { index?: number }).index ?? 0;
    return ai - bi;
  });
  for (const page of sortedPages) {
    if (hits.length >= count) break;
    const imageUrl =
      page?.thumbnail?.source ?? page?.original?.source;
    if (imageUrl == null) continue;
    const downloaded = await downloadImage('wikimedia', imageUrl);
    if (downloaded == null) continue;
    const title = page?.title ?? 'Wikipedia';
    hits.push({
      bytes: downloaded.bytes,
      filename: filenameFromUrl(imageUrl, downloaded.mime),
      mimeType: downloaded.mime,
      attribution: `${title} (Wikipedia)`,
    });
  }
  if (hits.length === 0) {
    console.info('[transform] wikipedia no usable images', {
      query,
      pagesSeen: sortedPages.length,
    });
  } else {
    console.info('[transform] wikipedia images hit', {
      query,
      count: hits.length,
    });
  }
  return hits;
};

export const MIN_IMAGE_COUNT = 1;
export const MAX_IMAGE_COUNT = 5;

const clampCount = (count: number): number => {
  if (!Number.isInteger(count)) return MIN_IMAGE_COUNT;
  if (count < MIN_IMAGE_COUNT) return MIN_IMAGE_COUNT;
  if (count > MAX_IMAGE_COUNT) return MAX_IMAGE_COUNT;
  return count;
};

export const fetchImages = async (
  query: string,
  source: ImageSource,
  count: number,
  options: { pexelsApiKey?: string } = {}
): Promise<ImageHit[]> => {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];
  const safeCount = clampCount(count);
  if (source === 'pexels') {
    if (options.pexelsApiKey == null || options.pexelsApiKey.length === 0) {
      return [];
    }
    return fetchFromPexels(trimmed, options.pexelsApiKey, safeCount);
  }
  return fetchFromWikimedia(trimmed, safeCount);
};

export const fetchImage = async (
  query: string,
  source: ImageSource,
  options: { pexelsApiKey?: string } = {}
): Promise<ImageHit | undefined> => {
  const hits = await fetchImages(query, source, 1, options);
  return hits[0];
};
