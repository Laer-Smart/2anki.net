import express from 'express';

import { JobWithDownloadKey } from '../../data_layer/JobRepository';
import ApkgPreviewService from '../ApkgPreviewService/ApkgPreviewService';
import DownloadService from '../DownloadService';
import StorageHandler from '../../lib/storage/StorageHandler';
import instrumentedAxios from '../observability/instrumentedAxios';
import { getSafeFilename } from '../../lib/getSafeFilename';

const APKG_KEY_PATTERN = /\.apkg$/i;
const MAX_TEXT_BYTES = 5 * 1024 * 1024;
const MAX_URL_BYTES = 100 * 1024 * 1024;
const PREVIEW_CARD_LIMIT = 20;

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
      cardCount: number | null;
      filename: string | null;
      summary: string;
    }
  | { kind: 'error'; message: string };

export interface ConvertInput {
  url?: string;
  text?: string;
  filename?: string;
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
    private readonly storage: StorageHandler
  ) {}

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

  async getDeckPreview(owner: string, key: string): Promise<DeckPreview> {
    if (!APKG_KEY_PATTERN.test(key)) {
      throw new Error('Not an .apkg upload.');
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
    locals: Record<string, unknown>
  ): Promise<ConvertResult> {
    const file = await this.buildFile(input);
    if (file == null) {
      return {
        kind: 'error',
        message: 'Provide either a url or text to convert.',
      };
    }

    const req = {
      files: [file],
      body: {},
      headers: {},
      cookies: {},
    } as unknown as express.Request;
    const res = new CapturingResponse(req);
    res.locals = locals;
    await this.uploadEntry(req, res as unknown as express.Response);
    return this.mapUploadResult(res);
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

  private mapUploadResult(res: CapturingResponse): ConvertResult {
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
      const cardCountHeader = res.get('X-Card-Count');
      const cardCount =
        cardCountHeader != null ? Number(cardCountHeader) : null;
      const filename = res.get('File-Name') ?? null;
      const summary =
        cardCount != null
          ? `${cardCount} cards. Find it in your 2anki downloads.`
          : 'Deck ready. Find it in your 2anki downloads.';
      return { kind: 'deck', cardCount, filename, summary };
    }
    return {
      kind: 'error',
      message: this.errorMessage(res.body),
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
