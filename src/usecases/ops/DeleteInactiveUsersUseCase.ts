import type { IInactivityEmailRepository } from '../../data_layer/InactivityEmailRepository';

export interface IInactiveUserDeleter {
  deleteUser(owner: string): Promise<unknown>;
}

export interface DeleteInactiveUsersResult {
  count: number;
  dryRun: boolean;
}

export class DeleteInactiveUsersUseCase {
  constructor(
    private readonly repo: IInactivityEmailRepository,
    private readonly userDeleter: IInactiveUserDeleter
  ) {}

  async execute(
    dryRun: boolean,
    limit = 100
  ): Promise<DeleteInactiveUsersResult> {
    const users = await this.repo.getUsersToDelete(limit);

    if (dryRun) {
      return { count: users.length, dryRun: true };
    }

    let deleted = 0;
    for (const user of users) {
      try {
        await this.userDeleter.deleteUser(String(user.id));
        deleted++;
      } catch (error) {
        console.error(
          `[inactivity-delete] failed to delete user ${user.id}:`,
          error
        );
      }
    }

    return { count: deleted, dryRun: false };
  }
}
