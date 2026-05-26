import JobRepository from '../../data_layer/JobRepository';
import Jobs from '../../data_layer/public/Jobs';

interface StartJobUseCaseInput {
  id: string;
  owner: string;
}

export class StartJobUseCase {
  constructor(private readonly jobRepository: JobRepository) {}

  async execute(input: StartJobUseCaseInput): Promise<Jobs> {
    const { id, owner } = input;
    const job = await this.jobRepository.findJobById(id, owner);

    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status === 'cancelled') {
      return job;
    }

    if (JobRepository.TERMINAL_STATUSES.includes(job.status)) {
      const restarted = await this.jobRepository.restartJob(id, owner);
      return restarted ?? job;
    }

    return this.jobRepository.updateJobStatus(id, owner, 'started', '');
  }
}
