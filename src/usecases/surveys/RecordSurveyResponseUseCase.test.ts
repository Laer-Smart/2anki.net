import { InMemoryUserSurveyRepository } from '../../data_layer/UserSurveyRepository';
import {
  RecordSurveyResponseUseCase,
  InvalidSurveyStatusError,
} from './RecordSurveyResponseUseCase';

describe('RecordSurveyResponseUseCase', () => {
  it('rejects an invalid status', async () => {
    const repository = new InMemoryUserSurveyRepository();
    const useCase = new RecordSurveyResponseUseCase(repository);

    await expect(
      useCase.execute('42', {
        status: 'maybe' as unknown as 'answered',
      })
    ).rejects.toBeInstanceOf(InvalidSurveyStatusError);
    expect(repository.count()).toBe(0);
  });

  it('trims and caps text at 2000 characters', async () => {
    const repository = new InMemoryUserSurveyRepository();
    const useCase = new RecordSurveyResponseUseCase(repository);
    const longText = 'x'.repeat(2500);

    await useCase.execute('42', {
      status: 'answered',
      improvement: `   ${longText}   `,
      studying: '  Languages  ',
    });

    const stored = repository.getData('42', 'post_login_v1');
    expect(stored).toEqual({
      status: 'answered',
      improvement: 'x'.repeat(2000),
      studying: 'Languages',
    });
  });

  it('stores empty or whitespace-only text as null', async () => {
    const repository = new InMemoryUserSurveyRepository();
    const useCase = new RecordSurveyResponseUseCase(repository);

    await useCase.execute('42', {
      status: 'dismissed',
      improvement: '   ',
      studying: '',
    });

    expect(repository.getData('42', 'post_login_v1')).toEqual({
      status: 'dismissed',
      improvement: null,
      studying: null,
    });
  });

  it('overwrites the previous response without creating a duplicate row', async () => {
    const repository = new InMemoryUserSurveyRepository();
    const useCase = new RecordSurveyResponseUseCase(repository);

    await useCase.execute('42', {
      status: 'dismissed',
    });
    await useCase.execute('42', {
      status: 'answered',
      improvement: 'Faster conversions',
      studying: 'Law',
    });

    expect(repository.count()).toBe(1);
    expect(repository.getData('42', 'post_login_v1')).toEqual({
      status: 'answered',
      improvement: 'Faster conversions',
      studying: 'Law',
    });
  });
});
