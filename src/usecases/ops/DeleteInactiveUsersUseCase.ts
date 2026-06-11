import type { IInactivityEmailRepository } from '../../data_layer/InactivityEmailRepository';
import type { ISuppressionEventsRepository } from '../../data_layer/SuppressionEventsRepository';
import { emailHash } from '../../lib/emailHash';

export interface IInactiveUserDeleter {
  deleteUser(owner: string): Promise<unknown>;
}

export interface DeleteInactiveUsersResult {
  count: number;
  dryRun: boolean;
}

interface DeletionCandidate {
  id: number;
  email: string;
}

export class DeleteInactiveUsersUseCase {
  constructor(
    private readonly repo: IInactivityEmailRepository,
    private readonly userDeleter: IInactiveUserDeleter,
    private readonly suppressionRepo: ISuppressionEventsRepository
  ) {}

  async execute(
    dryRun: boolean,
    limit = 100
  ): Promise<DeleteInactiveUsersResult> {
    const candidates = await this.collectCandidates(limit);

    if (dryRun) {
      return { count: candidates.length, dryRun: true };
    }

    let deleted = 0;
    for (const candidate of candidates) {
      try {
        await this.userDeleter.deleteUser(String(candidate.id));
        deleted++;
      } catch (error) {
        console.error(
          `[inactivity-delete] failed to delete user ${candidate.id}:`,
          error
        );
      }
    }

    return { count: deleted, dryRun: false };
  }

  private async collectCandidates(limit: number): Promise<DeletionCandidate[]> {
    const warned = await this.repo.getUsersToDelete(limit);
    const deadAddress = await this.collectDeadAddressCandidates(limit);

    const merged: DeletionCandidate[] = [];
    const seen = new Set<number>();
    for (const candidate of [...warned, ...deadAddress]) {
      if (seen.has(candidate.id)) {
        continue;
      }
      seen.add(candidate.id);
      merged.push(candidate);
    }

    return merged.slice(0, limit);
  }

  private async collectDeadAddressCandidates(
    limit: number
  ): Promise<DeletionCandidate[]> {
    const candidates = await this.repo.getDeadAddressCandidates(limit);
    const deadAddress: DeletionCandidate[] = [];
    for (const candidate of candidates) {
      const suppressed = await this.suppressionRepo.isSuppressed(
        emailHash(candidate.email)
      );
      if (suppressed) {
        deadAddress.push(candidate);
      }
    }
    return deadAddress;
  }
}
