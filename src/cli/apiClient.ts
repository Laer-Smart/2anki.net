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

  async uploadFile(filename: string, bytes: Uint8Array): Promise<UploadJob> {
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
    return (await this.parse(res)) as UploadJob;
  }
}

export default ApiClient;
