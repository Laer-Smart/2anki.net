import fs from 'node:fs';
import StorageHandler from '../../StorageHandler';
import { Knex } from 'knex';
import NotionAPIWrapper from '../../../../services/NotionService/NotionAPIWrapper';
import JobRepository from '../../../../data_layer/JobRepository';
import UsersRepository from '../../../../data_layer/UsersRepository';
import UploadRepository from '../../../../data_layer/UploadRespository';
import SettingsRepository from '../../../../data_layer/SettingsRepository';
import ParserRulesRepository from '../../../../data_layer/ParserRulesRepository';
import {
  CheckMonthlyCardLimitUseCase,
  MonthlyLimitError,
} from '../../../../usecases/users/CheckMonthlyCardLimitUseCase';
import { CreateJobWorkSpaceUseCase } from '../../../../usecases/jobs/CreateJobWorkSpaceUseCase';
import { CreateFlashcardsForJobUseCase } from '../../../../usecases/jobs/CreateFlashcardsForJobUseCase';
import { SetJobFailedUseCase } from '../../../../usecases/jobs/SetJobFailedUseCase';
import { BuildDeckForJobUseCase } from '../../../../usecases/jobs/BuildDeckForJobUseCase';
import { CompleteJobUseCase } from '../../../../usecases/jobs/CompleteJobUseCase';
import { NotifyUserUseCase } from '../../../../usecases/jobs/NotifyUserUseCase';
import {
  EMPTY_DECK_FAILURE_REASON,
  isColumnsAmbiguousError,
  isNotionUnauthorizedError,
  jobFailureReasonCode,
  jobFailureReasonFromError,
} from '../../../../usecases/jobs/jobFailureReason';
import { PythonExitError } from '../../../anki/buildPythonExitError';
import { EmptyDeckError } from '../../../../usecases/jobs/EmptyDeckError';
import { track } from '../../../../services/events/track';
import NotionRepository from '../../../../data_layer/NotionRespository';
import { getDefaultEmailService } from '../../../../services/EmailService/EmailService';
import { MarkNotionTokenInvalidUseCase } from '../../../../usecases/notion/MarkNotionTokenInvalidUseCase';
import { UnsupportedNotionBlockRepository } from '../../../../data_layer/UnsupportedNotionBlockRepository';
import { ConversionOutputStatsRepository } from '../../../../data_layer/ConversionOutputStatsRepository';

type CardCountBucket = '<50' | '50-499' | '500+';
type ConversionSource = 'notion' | 'upload' | 'google_drive';

function toCardCountBucket(count: number): CardCountBucket {
  if (count < 50) return '<50';
  if (count < 500) return '50-499';
  return '500+';
}

function toConversionSource(type?: string): ConversionSource {
  if (type === 'google_drive') return 'google_drive';
  if (type === 'page') return 'notion';
  return 'upload';
}

interface ConversionRequest {
  title: string;
  api: NotionAPIWrapper;
  id: string;
  owner: string;
  isPaying: boolean;
  type?: string;
  jobDbId: string | number;
  frontField?: string;
  backField?: string;
  anonId?: string;
}

function toAnonymousId(anonId?: string): string | null {
  return typeof anonId === 'string' && anonId.length > 0 ? anonId : null;
}

function recordUnsupportedBlocks(database: Knex, types: string[]): void {
  if (types == null || types.length === 0) {
    return;
  }
  try {
    void new UnsupportedNotionBlockRepository(database)
      .record(types)
      .catch((error) => {
        console.error(
          '[conversion] failed to record unsupported blocks',
          error
        );
      });
  } catch (error) {
    console.error('[conversion] failed to record unsupported blocks', error);
  }
}

function recordConversionOutputStats(
  database: Knex,
  delta: { decks: number; cards: number; emptyBack: number }
): void {
  try {
    void new ConversionOutputStatsRepository(database)
      .record('convert', delta)
      .catch((error) => {
        console.error(
          '[conversion] failed to record conversion output stats',
          error
        );
      });
  } catch (error) {
    console.error(
      '[conversion] failed to record conversion output stats',
      error
    );
  }
}

function trackConversionFailed(
  owner: string,
  anonId: string | undefined,
  type: string | undefined,
  reasonProps: Record<string, unknown>
): void {
  track('conversion_failed', {
    userId: Number.isFinite(Number(owner)) ? Number(owner) : null,
    anonymousId: toAnonymousId(anonId),
    props: { source: toConversionSource(type), ...reasonProps },
  });
}

export default async function performConversion(
  database: Knex,
  {
    title,
    api,
    id,
    owner,
    isPaying,
    type,
    jobDbId,
    frontField,
    backField,
    anonId,
  }: ConversionRequest
) {
  console.info(`Performing conversion for ${id}`);

  const storage = new StorageHandler();
  const jobRepository = new JobRepository(database);
  const usersRepository = new UsersRepository(database);
  const settingsRepository = new SettingsRepository(database);
  const parserRulesRepository = new ParserRulesRepository(database);

  let workspaceLocation: string | undefined;

  try {
    const createWorkSpace = new CreateJobWorkSpaceUseCase(
      jobRepository,
      settingsRepository,
      parserRulesRepository
    );
    const { ws, exporter, settings, bl, rules } = await createWorkSpace.execute(
      { api, id, owner, jobRepository, isPaying }
    );
    workspaceLocation = ws.location;

    const createFlashcards = new CreateFlashcardsForJobUseCase(jobRepository);
    const decks = await createFlashcards.execute({
      bl,
      id,
      owner,
      rules,
      settings,
      type,
      frontField,
      backField,
    });
    if (!decks || decks.length === 0) {
      const setJobFailed = new SetJobFailedUseCase(jobRepository);
      await setJobFailed.execute(
        id,
        owner,
        'No decks created, please try again or contact support with' +
          id +
          '.' +
          String(jobDbId)
      );
      trackConversionFailed(owner, anonId, type, {
        reason: 'no_decks_created',
      });
      return;
    }

    const cardCount = decks.reduce((acc, d) => acc + d.cards.length, 0);
    if (cardCount === 0) {
      const setJobFailed = new SetJobFailedUseCase(jobRepository);
      await setJobFailed.execute(id, owner, EMPTY_DECK_FAILURE_REASON);
      trackConversionFailed(owner, anonId, type, { reason: 'empty_deck' });
      return;
    }

    const checkMonthlyLimit = new CheckMonthlyCardLimitUseCase(usersRepository);
    try {
      await checkMonthlyLimit.execute({
        userId: owner,
        candidateCardCount: cardCount,
        isPaying,
      });
    } catch (error) {
      if (error instanceof MonthlyLimitError) {
        const setJobFailed = new SetJobFailedUseCase(jobRepository);
        const payload = JSON.stringify({
          code: 'monthly_limit',
          cards_used: error.cards_used,
          limit: error.limit,
          reset_on: error.reset_on,
        });
        await setJobFailed.execute(id, owner, payload);
        trackConversionFailed(owner, anonId, type, {
          reason: 'monthly_limit',
          cards_used: error.cards_used,
          limit: error.limit,
        });
        return;
      }
      throw error;
    }

    const buildDeck = new BuildDeckForJobUseCase(
      jobRepository,
      new UploadRepository(database)
    );
    const { size, key, apkg } = await buildDeck.execute({
      bl,
      exporter,
      decks,
      ws,
      settings,
      storage,
      id,
      owner,
      type,
    });

    const notifyUser = new NotifyUserUseCase(usersRepository);
    await notifyUser.execute({
      owner,
      rules,
      size,
      key,
      id,
      apkg,
    });

    const completeJob = new CompleteJobUseCase(jobRepository, usersRepository);
    await completeJob.execute(
      id,
      owner,
      cardCount,
      bl.truncation,
      bl.droppedAssetCount
    );

    recordUnsupportedBlocks(database, bl.unsupportedBlockTypes);
    recordConversionOutputStats(database, {
      decks: decks.length,
      cards: bl.cardCount,
      emptyBack: bl.emptyBackCount,
    });

    const userId = Number.isFinite(Number(owner)) ? Number(owner) : null;
    track('conversion_succeeded', {
      userId,
      anonymousId: toAnonymousId(anonId),
      props: {
        source: toConversionSource(type),
        card_count_bucket: toCardCountBucket(cardCount),
      },
    });
  } catch (error) {
    if (error instanceof PythonExitError) {
      console.error('[conversion] python crash', {
        jobId: id,
        kind: error.kind,
        code: error.code,
        rawOutput: error.rawOutput,
      });
    }
    if (isNotionUnauthorizedError(error)) {
      const ownerNum = Number(owner);
      if (Number.isFinite(ownerNum)) {
        const notionRepo = new NotionRepository(database);
        await new MarkNotionTokenInvalidUseCase(
          notionRepo,
          new UsersRepository(database),
          getDefaultEmailService()
        ).execute(ownerNum);
      }
    }
    const failedJob = new SetJobFailedUseCase(jobRepository);
    await failedJob.execute(id, owner, jobFailureReasonFromError(error, id));
    trackConversionFailed(owner, anonId, type, {
      reason: jobFailureReasonCode(error),
    });
    const isExpectedUserState =
      error instanceof EmptyDeckError ||
      isColumnsAmbiguousError(error) ||
      isNotionUnauthorizedError(error);
    if (isExpectedUserState) {
      console.info('[conversion] user-input state', {
        jobId: id,
        kind: error instanceof Error ? error.name : 'unknown',
      });
    } else {
      console.error(error);
    }
  } finally {
    if (workspaceLocation != null) {
      try {
        fs.rmSync(workspaceLocation, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('[conversion] workspace cleanup failed', {
          jobId: id,
          message:
            cleanupError instanceof Error ? cleanupError.message : 'unknown',
        });
      }
    }
  }
}
