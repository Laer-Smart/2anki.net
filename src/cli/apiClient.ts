import { CliConfig, resolveApiBase } from './config';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface UploadJob {
  key?: string;
  status?: string;
  title?: string;
  [k: string]: unknown;
}

export interface BatchDeck {
  name: string;
  filename: string;
  downloadUrl: string;
}

export type ConvertResult =
  | { kind: 'single'; bytes: Uint8Array; deckName: string; cardCount: number }
  | { kind: 'batch'; decks: BatchDeck[] };

export class ApiClient {
  private readonly base: string;

  constructor(
    private readonly config: CliConfig,
    private readonly fetchImpl: typeof fetch = fetch
  ) {
    this.base = resolveApiBase(config).replace(/\/$/, '');
  }

  private authHeader(): Record<string, string> {
    if (this.config.apiKey == null) {
      throw new ApiError('Not logged in. Run `2anki login` first.', 401);
    }
    return { Authorization: `Bearer ${this.config.apiKey}` };
  }

  private async parse(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!res.ok) {
      let message = `${res.status} ${res.statusText}`;
      try {
        const body = JSON.parse(text) as { message?: string };
        if (body.message != null) message = body.message;
      } catch {
        // non-JSON error body
      }
      throw new ApiError(message, res.status);
    }
    return text.length > 0 ? JSON.parse(text) : {};
  }

  /** Key-authed read used to verify a key on login/whoami. */
  async listJobs(): Promise<UploadJob[]> {
    const res = await this.fetchImpl(`${this.base}/api/upload/jobs`, {
      headers: this.authHeader(),
    });
    const body = await this.parse(res);
    return Array.isArray(body) ? (body as UploadJob[]) : [];
  }

  /**
   * Convert a file. `/api/upload/file` responds synchronously: a single deck
   * comes back as raw `application/apkg` bytes (with File-Name / X-Card-Count
   * headers); multiple decks come back as JSON with per-deck download URLs.
   */
  async convert(filename: string, bytes: Uint8Array): Promise<ConvertResult> {
    const form = new FormData();
    // Uint8Array is a valid BlobPart at runtime; the DOM lib's ArrayBuffer vs
    // ArrayBufferLike distinction is a type-only mismatch under Node.
    // The server's multer parses the upload field named `pakker` (.array).
    form.append('pakker', new Blob([bytes as unknown as BlobPart]), filename);
    const res = await this.fetchImpl(`${this.base}/api/upload/file`, {
      method: 'POST',
      headers: this.authHeader(),
      body: form,
    });
    if (!res.ok) {
      const text = await res.text();
      let message = `${res.status} ${res.statusText}`;
      try {
        const body = JSON.parse(text) as { message?: string };
        if (body.message != null) message = body.message;
      } catch {
        if (text.trim().length > 0) message = text.trim();
      }
      throw new ApiError(message, res.status);
    }
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const body = (await res.json()) as { decks?: BatchDeck[] };
      return { kind: 'batch', decks: body.decks ?? [] };
    }
    const out = new Uint8Array(await res.arrayBuffer());
    const nameHeader = res.headers.get('file-name');
    const deckName =
      nameHeader != null && nameHeader.length > 0
        ? decodeURIComponent(nameHeader)
        : `${filename.replace(/\.[^.]+$/, '')}.apkg`;
    const cardCount = Number(res.headers.get('x-card-count') ?? 0);
    return { kind: 'single', bytes: out, deckName, cardCount };
  }

  /** Download a batch deck. The /download/:id/:file route is public (UUID). */
  async downloadDeck(downloadUrl: string): Promise<Uint8Array> {
    const res = await this.fetchImpl(`${this.base}${downloadUrl}`);
    if (!res.ok) {
      throw new ApiError(
        `Download failed: ${res.status} ${res.statusText}`,
        res.status
      );
    }
    return new Uint8Array(await res.arrayBuffer());
  }
}

export default ApiClient;
