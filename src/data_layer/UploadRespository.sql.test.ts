import knex from 'knex';
import UploadRepository from './UploadRespository';

describe('UploadRepository.update generated SQL', () => {
  it('inserts the source column alongside the existing upload fields', () => {
    const pg = knex({ client: 'pg' });
    const repo = new UploadRepository(pg);

    const sql = (
      repo.update(7, 'deck.apkg', 'key/deck.apkg', 1.5, 'app') as unknown as {
        toString(): string;
      }
    ).toString();

    expect(sql).toBe(
      'insert into "uploads" ("filename", "key", "owner", "size_mb", "source") values (\'deck.apkg\', \'key/deck.apkg\', 7, 1.5, \'app\')'
    );
  });

  it('inserts a null source when none is supplied', () => {
    const pg = knex({ client: 'pg' });
    const repo = new UploadRepository(pg);

    const sql = (
      repo.update(7, 'deck.apkg', 'key/deck.apkg', 1.5) as unknown as {
        toString(): string;
      }
    ).toString();

    expect(sql).toBe(
      'insert into "uploads" ("filename", "key", "owner", "size_mb", "source") values (\'deck.apkg\', \'key/deck.apkg\', 7, 1.5, NULL)'
    );
  });
});

describe('UploadRepository.getLastReconvertibleUpload generated SQL', () => {
  it('filters apkg keys with a bound parameter and orders by created_at desc', () => {
    const pg = knex({ client: 'pg' });

    const sql = pg('uploads')
      .select('key', 'filename', 'created_at')
      .where({ owner: 7 })
      .whereNotNull('filename')
      .whereRaw('lower(key) like ?', ['%.apkg'])
      .orderBy('created_at', 'desc')
      .first()
      .toString();

    expect(sql).toBe(
      'select "key", "filename", "created_at" from "uploads" where "owner" = 7 and "filename" is not null and lower(key) like \'%.apkg\' order by "created_at" desc limit 1'
    );
  });
});
