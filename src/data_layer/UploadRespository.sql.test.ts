import knex from 'knex';

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
