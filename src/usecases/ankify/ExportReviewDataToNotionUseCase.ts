import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { INotionRepository } from '../../data_layer/NotionRespository';
import {
  AnkiConnectClient,
  AnkiConnectUnreachableError,
} from '../../services/ankify/AnkiConnectClient';
import { NoActiveAnkifyClientError } from './SendUploadToRacUseCase';

export class NotionNotConnectedError extends Error {
  constructor() {
    super('Notion is not connected for this user');
    this.name = 'NotionNotConnectedError';
  }
}

export interface TrackerSchema {
  properties: Record<string, { type: string; name?: string }>;
}

export const findTrackerPropertyKey = (
  schema: TrackerSchema,
  desiredName: string,
  desiredType: string
): string | null => {
  const target = desiredName.trim().toLowerCase();
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (prop.type !== desiredType) continue;
    if (key.trim().toLowerCase() === target) return key;
    const innerName = (prop.name ?? '').trim().toLowerCase();
    if (innerName === target) return key;
  }
  return null;
};

export class MissingTrackerSchemaError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(`Tracker is missing required columns: ${missing.join(', ')}`);
    this.name = 'MissingTrackerSchemaError';
    this.missing = missing;
  }
}

export interface ExportReviewDataInput {
  owner: number;
  databaseId: string;
  dateRangeDays?: number;
  ankiConnectHost?: string;
}

export interface ExportReviewDataResult {
  exported: number;
  skipped: number;
  errors: string[];
  totalDays: number;
}

export interface NotionPagesClient {
  create(params: {
    parent: { database_id: string };
    properties: Record<string, unknown>;
  }): Promise<unknown>;
}

export interface NotionDatabasesClient {
  query(params: {
    database_id: string;
    filter: { property: string; date: { equals: string } };
  }): Promise<{ results: unknown[] }>;
}

export interface NotionExportClient {
  databases: NotionDatabasesClient;
  pages: NotionPagesClient;
  getSchema(databaseId: string): Promise<TrackerSchema>;
}

export type NotionClientFactory = (token: string) => NotionExportClient;

export type AnkiConnectFactoryForExport = (
  host: string,
  port: number,
  apiKey: string | null
) => AnkiConnectClient;

export class ExportReviewDataToNotionUseCase {
  constructor(
    private readonly clients: AnkifyClientsRepositoryInterface,
    private readonly notionRepo: INotionRepository,
    private readonly ankiConnect: AnkiConnectFactoryForExport,
    private readonly notionClient: NotionClientFactory
  ) {}

  async execute(input: ExportReviewDataInput): Promise<ExportReviewDataResult> {
    if (!input.databaseId || input.databaseId.trim().length === 0) {
      throw new Error('database_id is required');
    }

    const client = await this.clients.findActiveByOwner(input.owner);
    if (client == null) {
      throw new NoActiveAnkifyClientError();
    }
    await this.clients.touchLastActiveAt(client.id);

    const token = await this.notionRepo.getNotionToken(String(input.owner));
    if (token == null || token.trim().length === 0) {
      throw new NotionNotConnectedError();
    }

    const host = input.ankiConnectHost ?? 'localhost';
    const ac = this.ankiConnect(
      host,
      client.anki_port,
      client.anki_connect_api_key
    );

    const { filtered, minutesByDay } = await this.loadHistory(
      ac,
      input.dateRangeDays
    );

    const notion = this.notionClient(token);
    const keys = await this.resolveSchemaKeys(notion, input.databaseId);

    const result: ExportReviewDataResult = {
      exported: 0,
      skipped: 0,
      errors: [],
      totalDays: filtered.length,
    };

    for (const [date, reviewCount] of filtered) {
      await this.exportDay({
        notion,
        databaseId: input.databaseId,
        date,
        reviewCount,
        keys,
        minutesByDay,
        result,
      });
    }

    return result;
  }

  private async loadHistory(
    ac: AnkiConnectClient,
    dateRangeDays: number | undefined
  ): Promise<{
    filtered: Array<[string, number]>;
    minutesByDay: Map<string, number>;
  }> {
    let raw: Array<[string, number]>;
    try {
      raw = await ac.getNumCardsReviewedByDay();
    } catch (error) {
      if (error instanceof AnkiConnectUnreachableError) {
        throw error;
      }
      throw error;
    }

    let minutesByDay: Map<string, number>;
    try {
      minutesByDay = await ac.getReviewMinutesByDay();
    } catch {
      minutesByDay = new Map();
    }

    const filtered =
      dateRangeDays != null && dateRangeDays > 0
        ? raw.slice(-dateRangeDays)
        : raw;

    return { filtered, minutesByDay };
  }

  private async resolveSchemaKeys(
    notion: NotionExportClient,
    databaseId: string
  ): Promise<{
    dateKey: string;
    reviewsKey: string;
    timeSpentKey: string | null;
  }> {
    const schema = await notion.getSchema(databaseId);
    const dateKey = findTrackerPropertyKey(schema, 'Date', 'date');
    const reviewsKey = findTrackerPropertyKey(schema, 'Reviews', 'number');
    const timeSpentKey =
      findTrackerPropertyKey(schema, 'Time spent', 'number') ??
      findTrackerPropertyKey(schema, 'Time spent (min)', 'number') ??
      findTrackerPropertyKey(schema, 'Minutes', 'number');

    const missing: string[] = [];
    if (dateKey == null) missing.push('Date');
    if (reviewsKey == null) missing.push('Reviews');
    if (missing.length > 0) {
      throw new MissingTrackerSchemaError(missing);
    }

    return { dateKey: dateKey!, reviewsKey: reviewsKey!, timeSpentKey };
  }

  private async exportDay(args: {
    notion: NotionExportClient;
    databaseId: string;
    date: string;
    reviewCount: number;
    keys: { dateKey: string; reviewsKey: string; timeSpentKey: string | null };
    minutesByDay: Map<string, number>;
    result: ExportReviewDataResult;
  }): Promise<void> {
    const {
      notion,
      databaseId,
      date,
      reviewCount,
      keys,
      minutesByDay,
      result,
    } = args;
    try {
      const existing = await notion.databases.query({
        database_id: databaseId,
        filter: { property: keys.dateKey, date: { equals: date } },
      });
      if (existing.results.length > 0) {
        result.skipped += 1;
        return;
      }
      const properties: Record<string, unknown> = {
        [keys.dateKey]: { date: { start: date } },
        [keys.reviewsKey]: { number: reviewCount },
      };
      if (keys.timeSpentKey != null) {
        const minutes = Math.round(minutesByDay.get(date) ?? 0);
        properties[keys.timeSpentKey] = { number: minutes };
      }
      await notion.pages.create({
        parent: { database_id: databaseId },
        properties,
      });
      result.exported += 1;
    } catch (error) {
      result.errors.push(`${date}: ${(error as Error).message}`);
    }
  }
}
