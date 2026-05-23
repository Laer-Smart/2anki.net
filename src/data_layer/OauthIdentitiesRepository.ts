import { Knex } from 'knex';

import OauthIdentities, {
  OauthIdentitiesInitializer,
} from './public/OauthIdentities';
import { UsersId } from './public/Users';

class OauthIdentitiesRepository {
  private table = 'oauth_identities';

  constructor(private database: Knex) {}

  async findByProviderAndSubject(
    provider: string,
    subject: string
  ): Promise<OauthIdentities | null> {
    const row: OauthIdentities | undefined = await this.database(this.table)
      .where({ provider, subject })
      .first();
    return row ?? null;
  }

  async link(
    provider: string,
    subject: string,
    userId: UsersId
  ): Promise<void> {
    const row: OauthIdentitiesInitializer = {
      provider,
      subject,
      user_id: userId,
    };
    await this.database(this.table).insert(row);
  }
}

export default OauthIdentitiesRepository;
