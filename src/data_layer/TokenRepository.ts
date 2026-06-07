import express from 'express';

import AccessTokens from './public/AccessTokens';
import { Knex } from 'knex';
import { SESSION_MAX_AGE_MS } from '../shared/session';

class TokenRepository {
  table: string;

  constructor(private readonly database: Knex) {
    this.table = 'access_tokens';
  }

  getAccessToken(req: express.Request): Promise<AccessTokens> {
    return this.database(this.table)
      .where({ token: req.cookies.token })
      .first();
  }

  getAccessTokenFromString(token: string): Promise<AccessTokens> {
    return this.database(this.table).where({ token: token }).first();
  }

  deleteAccessToken(token: any) {
    return this.database(this.table).where({ token }).del();
  }

  async updateAccessToken(token: string, id: string) {
    await this.database(this.table)
      .where({ owner: id })
      .where('created_at', '<', this.expiryCutoff())
      .del();
    return this.database(this.table).insert({
      token,
      owner: id,
    });
  }

  deleteAllForOwner(id: string): Promise<number> {
    return this.database(this.table).where({ owner: id }).del();
  }

  deleteExpired(): Promise<number> {
    return this.database(this.table)
      .where('created_at', '<', this.expiryCutoff())
      .del();
  }

  private expiryCutoff(): Date {
    return new Date(Date.now() - SESSION_MAX_AGE_MS);
  }
}

export default TokenRepository;
