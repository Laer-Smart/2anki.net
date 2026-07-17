import UsersRepository from '../../data_layer/UsersRepository';

export interface GrantDeveloperAccessResult {
  updated: number;
  granted: boolean;
}

export class InvalidEmailError extends Error {
  constructor() {
    super('A valid email is required.');
    this.name = 'InvalidEmailError';
  }
}

export class GrantDeveloperAccessUseCase {
  constructor(private readonly usersRepo: UsersRepository) {}

  async execute(
    email: unknown,
    grant: boolean
  ): Promise<GrantDeveloperAccessResult> {
    if (typeof email !== 'string' || !email.includes('@')) {
      throw new InvalidEmailError();
    }
    const updated = await this.usersRepo.setDeveloperAccessByEmail(
      email.trim(),
      grant
    );
    return { updated, granted: grant };
  }
}

export default GrantDeveloperAccessUseCase;
