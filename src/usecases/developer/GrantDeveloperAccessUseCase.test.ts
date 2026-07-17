import GrantDeveloperAccessUseCase, {
  InvalidEmailError,
} from './GrantDeveloperAccessUseCase';
import UsersRepository from '../../data_layer/UsersRepository';

function makeUsersRepo(affected: number) {
  return {
    setDeveloperAccessByEmail: jest.fn(async () => affected),
  } as unknown as UsersRepository;
}

describe('GrantDeveloperAccessUseCase', () => {
  it('grants access by email and reports the affected count', async () => {
    const repo = makeUsersRepo(1);
    const result = await new GrantDeveloperAccessUseCase(repo).execute(
      'dev@example.com',
      true
    );
    expect(result).toEqual({ updated: 1, granted: true });
    expect(repo.setDeveloperAccessByEmail).toHaveBeenCalledWith(
      'dev@example.com',
      true
    );
  });

  it('reports zero updated when no account matches', async () => {
    const result = await new GrantDeveloperAccessUseCase(
      makeUsersRepo(0)
    ).execute('nobody@example.com', true);
    expect(result.updated).toBe(0);
  });

  it('rejects a value that is not an email', async () => {
    await expect(
      new GrantDeveloperAccessUseCase(makeUsersRepo(0)).execute(
        'notanemail',
        true
      )
    ).rejects.toBeInstanceOf(InvalidEmailError);
  });
});
