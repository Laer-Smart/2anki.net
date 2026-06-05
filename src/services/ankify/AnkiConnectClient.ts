export const ANKI_CONNECT_VERSION = 6;
export const ANKI_CONNECT_DEFAULT_TIMEOUT_MS = 10_000;

export interface AnkiConnectNoteFields {
  [key: string]: string;
}

export interface AnkiConnectNote {
  deckName: string;
  modelName: string;
  fields: AnkiConnectNoteFields;
  tags?: string[];
  options?: {
    allowDuplicate?: boolean;
    duplicateScope?: 'deck' | 'collection';
  };
}

export interface AnkiConnectResponse<T> {
  result: T;
  error: string | null;
}

export class AnkiConnectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnkiConnectError';
  }
}

export class AnkiConnectUnreachableError extends Error {
  constructor(url: string, cause: unknown) {
    super(`AnkiConnect unreachable at ${url}`);
    this.name = 'AnkiConnectUnreachableError';
    if (cause instanceof Error) {
      this.stack = cause.stack;
    }
  }
}

type FetchLike = typeof fetch;

export class AnkiConnectClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs: number = ANKI_CONNECT_DEFAULT_TIMEOUT_MS,
    private readonly apiKey: string | null = null
  ) {}

  async createDeck(deck: string): Promise<number> {
    return this.invoke('createDeck', { deck });
  }

  async addNote(note: AnkiConnectNote): Promise<number> {
    return this.invoke('addNote', { note });
  }

  async addNotes(notes: AnkiConnectNote[]): Promise<Array<number | null>> {
    return this.invoke('addNotes', { notes });
  }

  async updateNoteFields(
    noteId: number,
    fields: AnkiConnectNoteFields
  ): Promise<null> {
    return this.invoke('updateNoteFields', { note: { id: noteId, fields } });
  }

  async findNotes(query: string): Promise<number[]> {
    return this.invoke('findNotes', { query });
  }

  async notesInfo(notes: number[]): Promise<AnkiNoteInfo[]> {
    return this.invoke('notesInfo', { notes });
  }

  async deckNames(): Promise<string[]> {
    return this.invoke('deckNames');
  }

  async modelNames(): Promise<string[]> {
    return this.invoke('modelNames');
  }

  async modelFieldNames(modelName: string): Promise<string[]> {
    return this.invoke('modelFieldNames', { modelName });
  }

  async createModel(params: AnkiConnectCreateModelParams): Promise<unknown> {
    return this.invoke(
      'createModel',
      params as unknown as Record<string, unknown>
    );
  }

  async updateModelStyling(
    params: AnkiConnectUpdateStylingParams
  ): Promise<null> {
    return this.invoke('updateModelStyling', { model: params });
  }

  async updateModelTemplates(
    params: AnkiConnectUpdateTemplatesParams
  ): Promise<null> {
    return this.invoke('updateModelTemplates', { model: params });
  }

  async storeMediaFile(
    params: AnkiConnectStoreMediaFileParams
  ): Promise<string> {
    return this.invoke(
      'storeMediaFile',
      params as unknown as Record<string, unknown>
    );
  }

  async getNumCardsReviewedByDay(): Promise<Array<[string, number]>> {
    return this.invoke('getNumCardsReviewedByDay');
  }

  async cardReviews(deck: string, startID: number): Promise<number[][]> {
    return this.invoke('cardReviews', { deck, startID });
  }

  async getReviewMinutesByDay(): Promise<Map<string, number>> {
    const decks = await this.deckNames();
    const minutesByDay = new Map<string, number>();
    for (const deck of decks) {
      const reviews = await this.cardReviews(deck, 0);
      for (const review of reviews) {
        const reviewTimeMs = review[0];
        const reviewDurationMs = review[7];
        if (
          typeof reviewTimeMs !== 'number' ||
          typeof reviewDurationMs !== 'number'
        ) {
          continue;
        }
        const isoDate = new Date(reviewTimeMs).toISOString().slice(0, 10);
        const prev = minutesByDay.get(isoDate) ?? 0;
        minutesByDay.set(isoDate, prev + reviewDurationMs / 60000);
      }
    }
    return minutesByDay;
  }

  async sync(): Promise<null> {
    return this.invoke('sync');
  }

  async ping(): Promise<number> {
    return this.invoke('version');
  }

  private async invoke<T>(
    action: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          version: ANKI_CONNECT_VERSION,
          ...(this.apiKey != null && this.apiKey.length > 0
            ? { key: this.apiKey }
            : {}),
          ...(params == null ? {} : { params }),
        }),
        signal: controller.signal,
      });
    } catch (error) {
      throw new AnkiConnectUnreachableError(this.baseUrl, error);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new AnkiConnectError(
        `AnkiConnect HTTP ${response.status} ${response.statusText}`
      );
    }

    const body = (await response.json()) as AnkiConnectResponse<T>;
    if (body.error != null) {
      throw new AnkiConnectError(body.error);
    }
    return body.result;
  }
}

export interface AnkiConnectCardTemplate {
  Name: string;
  Front: string;
  Back: string;
}

export interface AnkiConnectCreateModelParams {
  modelName: string;
  inOrderFields: string[];
  css: string;
  isCloze?: boolean;
  cardTemplates: AnkiConnectCardTemplate[];
}

export interface AnkiConnectUpdateStylingParams {
  name: string;
  css: string;
}

export interface AnkiConnectTemplateBody {
  Front: string;
  Back: string;
}

export interface AnkiConnectUpdateTemplatesParams {
  name: string;
  templates: Record<string, AnkiConnectTemplateBody>;
}

export interface AnkiConnectStoreMediaFileParams {
  filename: string;
  data: string;
}

export interface AnkiNoteInfo {
  noteId: number;
  modelName: string;
  tags: string[];
  fields: Record<string, { value: string; order: number }>;
  cards?: number[];
  mod?: number;
}

export const buildAnkiConnectUrl = (host: string, port: number): string =>
  `http://${host}:${port}`;
