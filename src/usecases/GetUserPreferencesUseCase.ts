import type {
  IUserPreferencesRepository,
  UserPreferences,
} from '../data_layer/UserPreferencesRepository';

export class GetUserPreferencesUseCase {
  constructor(private readonly repo: IUserPreferencesRepository) {}

  execute(userId: number): Promise<UserPreferences> {
    return this.repo.get(userId);
  }
}
