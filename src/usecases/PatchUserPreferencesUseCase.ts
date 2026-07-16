import type {
  IUserPreferencesRepository,
  UserPreferences,
  CardOptions,
} from '../data_layer/UserPreferencesRepository';

export interface PatchUserPreferencesInput {
  userId: number;
  cardOptions?: CardOptions;
  theme?: string;
  language?: string;
  ankiWebAcknowledgedAt?: string;
}

export class PatchUserPreferencesUseCase {
  constructor(private readonly repo: IUserPreferencesRepository) {}

  execute(input: PatchUserPreferencesInput): Promise<UserPreferences> {
    return this.repo.patch(input.userId, {
      cardOptions: input.cardOptions,
      theme: input.theme,
      language: input.language,
      ankiWebAcknowledgedAt: input.ankiWebAcknowledgedAt,
    });
  }
}
