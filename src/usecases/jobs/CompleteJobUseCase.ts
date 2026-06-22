import JobRepository from '../../data_layer/JobRepository';
import Jobs from '../../data_layer/public/Jobs';
import UsersRepository from '../../data_layer/UsersRepository';
import {
  buildNotionConversionSignalPayload,
  ConversionTruncation,
} from '../../services/NotionService/helpers/conversionTruncation';

export class CompleteJobUseCase {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly usersRepository?: UsersRepository
  ) {}

  async execute(
    jobId: string,
    owner: string,
    cardCount = 0,
    truncation?: ConversionTruncation,
    droppedAssetCount = 0
  ): Promise<Jobs> {
    const job = await this.jobRepository.findJobById(jobId, owner);

    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status === 'cancelled') {
      return job;
    }

    const updated = await this.jobRepository.updateJobStatus(
      jobId,
      owner,
      'done',
      buildNotionConversionSignalPayload(truncation, droppedAssetCount),
      cardCount
    );

    if (this.usersRepository && cardCount > 0) {
      await this.usersRepository.incrementCardUsage(owner, cardCount);
    }

    return updated;
  }
}
