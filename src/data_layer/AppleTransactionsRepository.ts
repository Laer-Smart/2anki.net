import type { Knex } from 'knex';

export interface AppleTransaction {
  id: number;
  user_id: number;
  transaction_id: string;
  product_id: string;
  environment: string;
  created_at: Date;
}

export interface RecordAppleTransaction {
  userId: number;
  transactionId: string;
  productId: string;
  environment: string;
}

export class DuplicateAppleTransactionError extends Error {
  constructor(readonly transactionId: string) {
    super('Apple transaction already recorded');
    this.name = 'DuplicateAppleTransactionError';
  }
}

export interface IAppleTransactionsRepository {
  record(input: RecordAppleTransaction, now: Date): Promise<AppleTransaction>;
}

interface AppleTransactionRow {
  id: number;
  user_id: number;
  transaction_id: string;
  product_id: string;
  environment: string;
  created_at: Date;
}

function toAppleTransaction(row: AppleTransactionRow): AppleTransaction {
  return {
    id: row.id,
    user_id: row.user_id,
    transaction_id: row.transaction_id,
    product_id: row.product_id,
    environment: row.environment,
    created_at:
      row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
  };
}

export class AppleTransactionsRepository implements IAppleTransactionsRepository {
  private readonly table = 'apple_transactions';

  constructor(private readonly database: Knex) {}

  async record(
    input: RecordAppleTransaction,
    now: Date
  ): Promise<AppleTransaction> {
    try {
      const [row] = await this.database<AppleTransactionRow>(this.table)
        .insert({
          user_id: input.userId,
          transaction_id: input.transactionId,
          product_id: input.productId,
          environment: input.environment,
          created_at: now,
        })
        .returning('*');
      return toAppleTransaction(row);
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        throw new DuplicateAppleTransactionError(input.transactionId);
      }
      throw err;
    }
  }
}

export class InMemoryAppleTransactionsRepository
  implements IAppleTransactionsRepository
{
  private readonly rows: AppleTransaction[] = [];
  private nextId = 1;

  async record(
    input: RecordAppleTransaction,
    now: Date
  ): Promise<AppleTransaction> {
    const existing = this.rows.find(
      (r) => r.transaction_id === input.transactionId
    );
    if (existing) {
      throw new DuplicateAppleTransactionError(input.transactionId);
    }
    const entry: AppleTransaction = {
      id: this.nextId++,
      user_id: input.userId,
      transaction_id: input.transactionId,
      product_id: input.productId,
      environment: input.environment,
      created_at: now,
    };
    this.rows.push(entry);
    return entry;
  }

  clear(): void {
    this.rows.length = 0;
    this.nextId = 1;
  }
}

export default AppleTransactionsRepository;
