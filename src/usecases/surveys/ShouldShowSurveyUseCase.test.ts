import { InMemoryUserSurveyRepository } from '../../data_layer/UserSurveyRepository';
import { ShouldShowSurveyUseCase } from './ShouldShowSurveyUseCase';

describe('ShouldShowSurveyUseCase', () => {
  it('returns true when no row exists for the user', async () => {
    const repository = new InMemoryUserSurveyRepository();
    const useCase = new ShouldShowSurveyUseCase(repository);

    await expect(useCase.execute('42')).resolves.toBe(true);
  });

  it('returns false after the user answered the survey', async () => {
    const repository = new InMemoryUserSurveyRepository();
    await repository.upsert('42', 'post_login_v1', {
      improvement: 'More themes',
      studying: 'Medicine',
      status: 'answered',
    });
    const useCase = new ShouldShowSurveyUseCase(repository);

    await expect(useCase.execute('42')).resolves.toBe(false);
  });

  it('returns false after the user dismissed the survey', async () => {
    const repository = new InMemoryUserSurveyRepository();
    await repository.upsert('42', 'post_login_v1', {
      improvement: null,
      studying: null,
      status: 'dismissed',
    });
    const useCase = new ShouldShowSurveyUseCase(repository);

    await expect(useCase.execute('42')).resolves.toBe(false);
  });

  it('isolates users by id', async () => {
    const repository = new InMemoryUserSurveyRepository();
    await repository.upsert('42', 'post_login_v1', {
      improvement: null,
      studying: null,
      status: 'dismissed',
    });
    const useCase = new ShouldShowSurveyUseCase(repository);

    await expect(useCase.execute('99')).resolves.toBe(true);
  });
});
