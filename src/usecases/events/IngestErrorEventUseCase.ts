import crypto from 'crypto';
import {
  IErrorEventRepository,
  ErrorEventInsert,
} from '../../data_layer/ErrorEventRepository';

export interface ErrorEventPayload {
  message: string;
  stack?: string | null;
  url?: string | null;
  userAgent?: string | null;
  release?: string | null;
  userId?: number | null;
  context?: Record<string, unknown> | null;
}

export interface IngestErrorEventInput {
  source: 'web' | 'server';
  payload: ErrorEventPayload;
  ipHash: string;
}

const DEDUP_WINDOW_MS = 5 * 60_000;

export class IngestErrorEventUseCase {
  constructor(private readonly repository: IErrorEventRepository) {}

  async execute(input: IngestErrorEventInput): Promise<'accepted' | 'duplicate'> {
    const messageHash = crypto
      .createHash('sha256')
      .update(input.payload.message)
      .digest('hex');

    const isDuplicate = await this.repository.existsWithinWindow(
      messageHash,
      input.ipHash,
      DEDUP_WINDOW_MS
    );

    if (isDuplicate) {
      return 'duplicate';
    }

    const row: ErrorEventInsert = {
      source: input.source,
      message_hash: messageHash,
      message: input.payload.message,
      stack: input.payload.stack ?? null,
      url: input.payload.url ?? null,
      user_agent: input.payload.userAgent ?? null,
      release: input.payload.release ?? null,
      user_id: input.payload.userId ?? null,
      ip_hash: input.ipHash,
      context: input.payload.context ?? null,
    };

    await this.repository.insert(row);
    return 'accepted';
  }
}
