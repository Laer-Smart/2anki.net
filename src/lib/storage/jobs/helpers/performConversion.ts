import StorageHandler from '../../StorageHandler';
import { Knex } from 'knex';
import NotionAPIWrapper from '../../../../services/NotionService/NotionAPIWrapper';
import JobRepository from '../../../../data_layer/JobRepository';
import UsersRepository from '../../../../data_layer/UsersRepository';
import UploadRepository from '../../../../data_layer/UploadRespository';
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
import { jobFailureReasonFromError } from '../../../../usecases/jobs/jobFailureReason';
import { PythonExitError } from '../../../anki/buildPythonExitError';
import { track } from '../../../../services/events/track';
import { EventsRepository } from '../../../../data_layer/EventsRepository';
import { EventsQueryService } from '../../../../services/events/EventsQueryService';

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
}

export default async function performConversion(
  database: Knex,
  { title, api, id, owner, isPaying, type, jobDbId, frontField, backField }: ConversionRequest
) {
  console.info(`Performing conversion for ${id}`);

  const storage = new StorageHandler();
  const jobRepository = new JobRepository(database);
  const usersRepository = new UsersRepository(database);

  try {
    const createWorkSpace = new CreateJobWorkSpaceUseCase(jobRepository);
    const { ws, exporter, settings, bl, rules } = await createWorkSpace.execute(
      { api, id, owner, jobRepository, isPaying }
    );

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
      return;
    }

    const cardCount = decks.reduce((acc, d) => acc + d.cards.length, 0);
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
        await setJobFailed.execute(id, owner, error.message);
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

    const notifyUser = new NotifyUserUseCase(jobRepository);
    await notifyUser.execute({
      owner,
      rules,
      db: database,
      size,
      key,
      id,
      apkg,
    });

    const completeJob = new CompleteJobUseCase(jobRepository, usersRepository);
    await completeJob.execute(id, owner, cardCount);

    const userId = Number.isFinite(Number(owner)) ? Number(owner) : null;
    track('conversion_succeeded', {
      userId,
      props: {
        source: toConversionSource(type),
        card_count_bucket: toCardCountBucket(cardCount),
      },
    });

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const eventsRepo = new EventsRepository(database);
    const eventsQuery = new EventsQueryService(eventsRepo);
    const priorEngagement = await eventsQuery.countByNameForUser(
      'upload_error_chat_engaged',
      thirtyMinutesAgo,
      userId,
      null
    );
    if (priorEngagement > 0) {
      track('upload_error_chat_resolved_retry', { userId });
    }
  } catch (error) {
    if (error instanceof PythonExitError) {
      console.error('[conversion] python crash', {
        jobId: id,
        kind: error.kind,
        code: error.code,
        rawOutput: error.rawOutput,
      });
    }
    const failedJob = new SetJobFailedUseCase(jobRepository);
    await failedJob.execute(id, owner, jobFailureReasonFromError(error, id));
    console.error(error);
  }
}
