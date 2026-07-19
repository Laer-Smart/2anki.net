import express from 'express';
import { randomUUID } from 'node:crypto';
import imageSize from 'image-size';

import { JobWithDownloadKey } from '../../data_layer/JobRepository';
import ApkgPreviewService from '../ApkgPreviewService/ApkgPreviewService';
import DownloadService from '../DownloadService';
import StorageHandler from '../../lib/storage/StorageHandler';
import instrumentedAxios from '../observability/instrumentedAxios';
import { getSafeFilename } from '../../lib/getSafeFilename';
import { DeckPersistence } from './McpDeckPersistence';
import { McpCard, serializeCardsToMarkdown } from './serializeCardsToMarkdown';
import {
  McpConvertOptions,
  mcpOptionsToCardSettings,
} from './mcpOptionsToCardSettings';
import { detectFileMime } from '../../lib/detectFileMime';
import { isPaying } from '../../lib/isPaying';
import type { VisionMediaType } from '../../lib/claude/countVisionTokens';
import {
  PhotoToFlashcardsUseCase,
  type GeneratedFlashcard,
  type PhotoDensity,
  type PhotoMode,
} from '../../usecases/imageOcclusion/PhotoToFlashcardsUseCase';

const APKG_KEY_PATTERN = /\.apkg$/i;
const MAX_TEXT_BYTES = 5 * 1024 * 1024;
const MAX_URL_BYTES = 100 * 1024 * 1024;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const PREVIEW_CARD_LIMIT = 20;
const MAX_CARDS = 500;
const DEFAULT_DECK_NAME = 'MCP deck';
const DATA_URL_PREFIX = /^data:[^,]*,/;
const ALLOWED_PHOTO_MEDIA_TYPES: VisionMediaType[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export interface PhotoDeckInput {
  image: string;
  density?: PhotoDensity;
  mode?: PhotoMode;
  includeSourceImage?: boolean;
}

export interface PhotoDeckResult {
  cards: GeneratedFlashcard[];
  count: number;
  summary: string;
}

interface DecodedPhoto {
  imageBase64: string;
  mediaType: VisionMediaType;
  width: number;
  height: number;
}

function isAllowedPhotoMediaType(
  value: string | null
): value is VisionMediaType {
  return (
    value != null && (ALLOWED_PHOTO_MEDIA_TYPES as string[]).includes(value)
  );
}

function decodePhotoInput(image: string): DecodedPhoto {
  const base64 = image.replace(DATA_URL_PREFIX, '').trim();
  if (base64.length === 0) {
    throw new Error('Provide a photo as a base64 string or data URL.');
  }

  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length === 0) {
    throw new Error("Couldn't decode the photo. Check the base64 data.");
  }
  if (buffer.length > MAX_PHOTO_BYTES) {
    throw new Error('Photo is over the 10 MB limit. Try a smaller image.');
  }

  const mediaType = detectFileMime(buffer);
  if (!isAllowedPhotoMediaType(mediaType)) {
    throw new Error('Unsupported image type. Use PNG, JPEG, WebP, or GIF.');
  }

  const dims = imageSize(buffer);
  if (dims.width == null || dims.height == null) {
    throw new Error("Couldn't read the photo's dimensions.");
  }

  return {
    imageBase64: base64,
    mediaType,
    width: dims.width,
    height: dims.height,
  };
}

export interface DeckSummary {
  jobId: string;
  title: string;
  status: string;
  createdAt: string | null;
  downloadUrl: string | null;
}

export interface DeckPreview {
  cardCount: number;
  deckCount: number;
  decks: { id: number; name: string; cardCount: number }[];
  sampleCards: { front: string; back: string }[];
}

export type ConvertResult =
  | { kind: 'processing'; jobId: string; summary: string }
  | {
      kind: 'batch';
      deckCount: number;
      decks: { name: string; downloadUrl: string }[];
      summary: string;
    }
  | {
      kind: 'deck';
      jobId?: string;
      cardCount: number | null;
      filename: string | null;
      downloadUrl?: string;
      deckCount?: number;
      decks?: { id: number; name: string; cardCount: number }[];
      sampleCards?: { front: string; back: string }[];
      summary: string;
    }
  | { kind: 'error'; message: string };

export interface ConvertInput {
  url?: string;
  text?: string;
  filename?: string;
  options?: McpConvertOptions;
}

export interface JobLister {
  getJobsByOwner(owner: string): Promise<JobWithDownloadKey[]>;
}

export type UploadEntrypoint = (
  req: express.Request,
  res: express.Response
) => unknown;

interface UploadedFile {
  originalname: string;
  size: number;
  buffer: Buffer;
}

class CapturingResponse {
  statusCode = 200;
  body: unknown;
  bodyBuffer: Buffer | null = null;
  redirectedTo: string | null = null;
  private readonly headers = new Map<string, string>();
  locals: Record<string, unknown> = {};
  req: express.Request;

  constructor(req: express.Request) {
    this.req = req;
  }

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  set(field: string, value?: string): this {
    if (value != null) {
      this.headers.set(field.toLowerCase(), value);
    }
    return this;
  }

  setHeader(field: string, value: string): this {
    return this.set(field, value);
  }

  get(field: string): string | undefined {
    return this.headers.get(field.toLowerCase());
  }

  contentType(_value: string): this {
    return this;
  }

  attachment(_filename?: string): this {
    return this;
  }

  json(payload: unknown): this {
    this.body = payload;
    return this;
  }

  send(payload: unknown): this {
    if (Buffer.isBuffer(payload)) {
      this.bodyBuffer = payload;
    } else {
      this.body = payload;
    }
    return this;
  }

  redirect(target: string): this {
    this.redirectedTo = target;
    return this;
  }
}

export class McpToolsService {
  constructor(
    private readonly jobLister: JobLister,
    private readonly downloadService: DownloadService,
    private readonly previewService: ApkgPreviewService,
    private readonly uploadEntry: UploadEntrypoint,
    private readonly storage: StorageHandler,
    private readonly deckPersistence: DeckPersistence,
    private readonly photoToFlashcards: PhotoToFlashcardsUseCase
  ) {}

  async photoToDeck(
    input: PhotoDeckInput,
    owner: string,
    locals: Record<string, unknown>
  ): Promise<PhotoDeckResult> {
    const photo = decodePhotoInput(input.image);
    const generated = await this.photoToFlashcards.generateCards({
      imageBase64: photo.imageBase64,
      mediaType: photo.mediaType,
      deckName: '',
      owner,
      isPaying: isPaying(locals),
      imageDimensions: { width: photo.width, height: photo.height },
      includeSourceImage: input.includeSourceImage,
      density: input.density,
      mode: input.mode,
    });

    return {
      cards: generated.cards,
      count: generated.cardCount,
      summary: `${generated.cardCount} cards from your photo. Review them, then call create_deck to build and download the deck.`,
    };
  }

  async listMyDecks(owner: string): Promise<DeckSummary[]> {
    const jobs = await this.jobLister.getJobsByOwner(owner);
    return jobs.map((job) => ({
      jobId: job.object_id,
      title: job.title ?? 'Untitled deck',
      status: job.status,
      createdAt: job.created_at ? new Date(job.created_at).toISOString() : null,
      downloadUrl:
        job.download_key != null
          ? `/api/upload/jobs/${job.object_id}/download`
          : null,
    }));
  }

  async getDeckPreview(owner: string, jobId: string): Promise<DeckPreview> {
    const jobs = await this.jobLister.getJobsByOwner(owner);
    const job = jobs.find((entry) => entry.object_id === jobId);
    if (!job) {
      throw new Error('Deck not found.');
    }
    const key = job.download_key;
    if (key == null || !APKG_KEY_PATTERN.test(key)) {
      throw new Error('This deck has no .apkg to preview yet.');
    }
    const body = await this.downloadService.getFileBody(
      owner,
      key,
      this.storage
    );
    if (!body) {
      throw new Error('Upload not found.');
    }
    const parsed = await this.previewService.parse(
      `${owner}:${key}`,
      body as Buffer
    );
    const meta = this.previewService.getMeta(parsed);
    const mediaBaseUrl = `/api/apkg/${encodeURIComponent(key)}/media/`;
    const page = this.previewService.getCardsPage(
      parsed,
      0,
      PREVIEW_CARD_LIMIT,
      mediaBaseUrl
    );
    return {
      cardCount: meta.totalCards,
      deckCount: meta.decks.length,
      decks: meta.decks.map((deck) => ({
        id: deck.id,
        name: deck.fullName,
        cardCount: deck.cardCount,
      })),
      sampleCards: page.cards.map((card) => ({
        front: card.front,
        back: card.back,
      })),
    };
  }

  async convertToDeck(
    input: ConvertInput,
    owner: string,
    locals: Record<string, unknown>
  ): Promise<ConvertResult> {
    const file = await this.buildFile(input);
    if (file == null) {
      return {
        kind: 'error',
        message: 'Provide either a url or text to convert.',
      };
    }
    const res = await this.runUpload(
      file,
      locals,
      mcpOptionsToCardSettings(input.options)
    );
    return this.mapUploadResult(res, owner, file.originalname);
  }

  async createDeck(
    cards: McpCard[],
    deckName: string | undefined,
    owner: string,
    locals: Record<string, unknown>
  ): Promise<ConvertResult> {
    if (!Array.isArray(cards) || cards.length === 0) {
      return { kind: 'error', message: 'Provide at least 1 card.' };
    }
    if (cards.length > MAX_CARDS) {
      return {
        kind: 'error',
        message: `Too many cards — the limit is ${MAX_CARDS}. Split into smaller decks.`,
      };
    }
    if (cards.some((card) => card.front == null || card.front.trim() === '')) {
      return { kind: 'error', message: 'Every card needs a non-empty front.' };
    }

    const title =
      deckName != null && deckName.trim().length > 0
        ? deckName.trim()
        : DEFAULT_DECK_NAME;
    const markdown = serializeCardsToMarkdown(cards);
    const buffer = Buffer.from(markdown, 'utf-8');
    if (buffer.byteLength > MAX_TEXT_BYTES) {
      return {
        kind: 'error',
        message:
          'These cards are over the 5 MB limit. Split into smaller decks.',
      };
    }

    const file: UploadedFile = {
      originalname: getSafeFilename(`${title}.md`),
      size: buffer.byteLength,
      buffer,
    };
    const res = await this.runUpload(file, locals);
    const result = await this.mapUploadResult(res, owner, title);
    if (result.kind === 'deck' && result.cardCount == null) {
      return { ...result, cardCount: cards.length };
    }
    return result;
  }

  private async runUpload(
    file: UploadedFile,
    locals: Record<string, unknown>,
    body: Record<string, unknown> = {}
  ): Promise<CapturingResponse> {
    const req = {
      files: [file],
      body,
      headers: {},
      cookies: {},
    } as unknown as express.Request;
    const res = new CapturingResponse(req);
    res.locals = locals;
    await this.uploadEntry(req, res as unknown as express.Response);
    return res;
  }

  private async previewFromBytes(
    buffer: Buffer,
    filename: string | null
  ): Promise<Pick<DeckPreview, 'deckCount' | 'decks' | 'sampleCards'> | null> {
    try {
      const parsed = await this.previewService.parse(
        filename ?? 'deck.apkg',
        buffer
      );
      const meta = this.previewService.getMeta(parsed);
      const page = this.previewService.getCardsPage(
        parsed,
        0,
        PREVIEW_CARD_LIMIT,
        ''
      );
      return {
        deckCount: meta.decks.length,
        decks: meta.decks.map((deck) => ({
          id: deck.id,
          name: deck.fullName,
          cardCount: deck.cardCount,
        })),
        sampleCards: page.cards.map((card) => ({
          front: card.front,
          back: card.back,
        })),
      };
    } catch {
      return null;
    }
  }

  private async buildFile(input: ConvertInput): Promise<UploadedFile | null> {
    if (typeof input.text === 'string' && input.text.length > 0) {
      const buffer = Buffer.from(input.text, 'utf-8');
      if (buffer.byteLength > MAX_TEXT_BYTES) {
        throw new Error('Text is over the 5 MB limit. Try splitting it.');
      }
      const name = getSafeFilename(input.filename ?? 'deck.md');
      return { originalname: name, size: buffer.byteLength, buffer };
    }
    if (typeof input.url === 'string' && input.url.length > 0) {
      const response = await instrumentedAxios.get<ArrayBuffer>(
        'mcp',
        input.url,
        { responseType: 'arraybuffer', maxContentLength: MAX_URL_BYTES }
      );
      const buffer = Buffer.from(response.data);
      const name = getSafeFilename(
        input.filename ?? this.filenameFromUrl(input.url)
      );
      return { originalname: name, size: buffer.byteLength, buffer };
    }
    return null;
  }

  private filenameFromUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const last = parsed.pathname.split('/').filter(Boolean).pop();
      return last && last.length > 0 ? last : 'deck.html';
    } catch {
      return 'deck.html';
    }
  }

  private async mapUploadResult(
    res: CapturingResponse,
    owner: string,
    fallbackTitle: string
  ): Promise<ConvertResult> {
    if (res.statusCode === 202 && this.isJobBody(res.body)) {
      return {
        kind: 'processing',
        jobId: res.body.jobId,
        summary: 'Your deck is generating. Check list_my_decks for the result.',
      };
    }
    if (this.isBatchBody(res.body)) {
      const decks = res.body.decks.map((deck) => ({
        name: deck.name,
        downloadUrl: deck.downloadUrl,
      }));
      return {
        kind: 'batch',
        deckCount: decks.length,
        decks,
        summary: `${decks.length} decks ready to download.`,
      };
    }
    if (res.statusCode === 200 && res.bodyBuffer != null) {
      return this.persistDeckResult(res.bodyBuffer, res, owner, fallbackTitle);
    }
    return {
      kind: 'error',
      message: this.errorMessage(res.body),
    };
  }

  private async persistDeckResult(
    bytes: Buffer,
    res: CapturingResponse,
    owner: string,
    fallbackTitle: string
  ): Promise<ConvertResult> {
    const cardCountHeader = res.get('X-Card-Count');
    const cardCount = cardCountHeader != null ? Number(cardCountHeader) : null;
    const filename = res.get('File-Name') ?? null;
    const title = filename ?? fallbackTitle;
    const objectId = randomUUID();
    const key = await this.deckPersistence.persist(
      owner,
      objectId,
      title,
      bytes
    );
    const downloadUrl = await this.storage.getPresignedUrl(key);
    const preview = await this.previewFromBytes(bytes, filename);
    const summary =
      cardCount != null
        ? `${cardCount} cards. Ready to download.`
        : 'Deck ready to download.';
    return {
      kind: 'deck',
      jobId: objectId,
      cardCount,
      filename,
      downloadUrl,
      ...preview,
      summary,
    };
  }

  private isJobBody(body: unknown): body is { jobId: string } {
    return (
      typeof body === 'object' &&
      body != null &&
      typeof (body as { jobId?: unknown }).jobId === 'string'
    );
  }

  private isBatchBody(
    body: unknown
  ): body is { kind: 'batch'; decks: { name: string; downloadUrl: string }[] } {
    return (
      typeof body === 'object' &&
      body != null &&
      (body as { kind?: unknown }).kind === 'batch' &&
      Array.isArray((body as { decks?: unknown }).decks)
    );
  }

  private errorMessage(body: unknown): string {
    if (
      typeof body === 'object' &&
      body != null &&
      typeof (body as { message?: unknown }).message === 'string'
    ) {
      return (body as { message: string }).message;
    }
    return 'Could not convert this input.';
  }
}
