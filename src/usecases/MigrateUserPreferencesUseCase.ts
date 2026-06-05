import type { IUserPreferencesRepository, UserPreferences, CardOptions } from '../data_layer/UserPreferencesRepository';

export interface MigrateUserPreferencesInput {
  userId: number;
  cardOptions?: CardOptions;
  theme?: string;
  ankiWebAcknowledgedAt?: string;
}

export class MigrateUserPreferencesUseCase {
  constructor(private readonly repo: IUserPreferencesRepository) {}

  execute(input: MigrateUserPreferencesInput): Promise<UserPreferences> {
    return this.repo.migrate(input.userId, {
      cardOptions: input.cardOptions,
      theme: input.theme,
      ankiWebAcknowledgedAt: input.ankiWebAcknowledgedAt,
    });
  }
}
