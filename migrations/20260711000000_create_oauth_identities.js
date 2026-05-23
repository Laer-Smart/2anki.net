exports.up = async (knex) => {
  await knex.schema.createTable('oauth_identities', (t) => {
    t.increments('id').primary();
    t.text('provider').notNullable();
    t.text('subject').notNullable();
    t
      .integer('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    t.timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    t.unique(['provider', 'subject'], {
      indexName: 'oauth_identities_provider_subject_uniq',
    });
    t.index(['user_id'], 'oauth_identities_user_id_idx');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('oauth_identities');
};
