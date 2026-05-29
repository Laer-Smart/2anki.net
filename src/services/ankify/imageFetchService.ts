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
const WIKIMEDIA_SEARCH_URL = 'https://commons.wikimedia.org/w/api.php';

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

interface WikimediaSearchResponse {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        imageinfo?: Array<{ url?: string; mime?: string }>;
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
      timeout: 8000,
    });
    const mime =
      typeof response.headers['content-type'] === 'string'
        ? response.headers['content-type'].split(';')[0].trim()
        : 'image/jpeg';
    return { bytes: Buffer.from(response.data), mime };
  } catch {
    return undefined;
  }
};

const fetchFromPexels = async (
  query: string,
  apiKey: string
): Promise<ImageHit | undefined> => {
  let searchPayload: PexelsSearchResponse;
  try {
    const response = await instrumentedAxios.get<PexelsSearchResponse>(
      'pexels',
      PEXELS_SEARCH_URL,
      {
        params: { query, per_page: 1, orientation: 'landscape' },
        headers: { Authorization: apiKey },
        timeout: 5000,
      }
    );
    searchPayload = response.data;
  } catch {
    return undefined;
  }

  const photo = searchPayload.photos?.[0];
  const imageUrl = photo?.src?.medium ?? photo?.src?.large;
  if (imageUrl == null) return undefined;

  const downloaded = await downloadImage('pexels', imageUrl);
  if (downloaded == null) return undefined;

  const photographer = photo?.photographer ?? 'Pexels';
  return {
    bytes: downloaded.bytes,
    filename: filenameFromUrl(imageUrl, downloaded.mime),
    mimeType: downloaded.mime,
    attribution: `Photo by ${photographer} on Pexels`,
  };
};

const fetchFromWikimedia = async (
  query: string
): Promise<ImageHit | undefined> => {
  let searchPayload: WikimediaSearchResponse;
  try {
    const response = await instrumentedAxios.get<WikimediaSearchResponse>(
      'wikimedia',
      WIKIMEDIA_SEARCH_URL,
      {
        params: {
          action: 'query',
          format: 'json',
          generator: 'search',
          gsrsearch: query,
          gsrnamespace: 6,
          gsrlimit: 1,
          prop: 'imageinfo',
          iiprop: 'url|mime',
          origin: '*',
        },
        headers: {
          'User-Agent': '2anki/1.0 (https://2anki.net; support@2anki.net)',
        },
        timeout: 5000,
      }
    );
    searchPayload = response.data;
  } catch {
    return undefined;
  }

  const pages = searchPayload.query?.pages;
  if (pages == null) return undefined;
  const firstPage = Object.values(pages)[0];
  const info = firstPage?.imageinfo?.[0];
  const imageUrl = info?.url;
  if (imageUrl == null) return undefined;

  const mimeHint = info?.mime ?? 'image/jpeg';
  if (mimeHint === 'image/svg+xml') return undefined;

  const downloaded = await downloadImage('wikimedia', imageUrl);
  if (downloaded == null) return undefined;

  const title = firstPage?.title ?? 'Wikimedia Commons';
  return {
    bytes: downloaded.bytes,
    filename: filenameFromUrl(imageUrl, downloaded.mime),
    mimeType: downloaded.mime,
    attribution: `${title} (Wikimedia Commons)`,
  };
};

export const fetchImage = async (
  query: string,
  source: ImageSource,
  options: { pexelsApiKey?: string } = {}
): Promise<ImageHit | undefined> => {
  const trimmed = query.trim();
  if (trimmed.length === 0) return undefined;
  if (source === 'pexels') {
    if (options.pexelsApiKey == null || options.pexelsApiKey.length === 0) {
      return undefined;
    }
    return fetchFromPexels(trimmed, options.pexelsApiKey);
  }
  return fetchFromWikimedia(trimmed);
};
