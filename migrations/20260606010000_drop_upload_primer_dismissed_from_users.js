exports.up = (knex) =>
  knex.schema.alterTable('users', (t) => {
    t.dropColumn('upload_primer_dismissed_at');
  });

exports.down = (knex) =>
  knex.schema.alterTable('users', (t) => {
    t.timestamp('upload_primer_dismissed_at', { useTz: true }).nullable().defaultTo(null);
  });
