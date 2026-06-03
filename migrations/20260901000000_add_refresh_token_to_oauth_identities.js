exports.up = async (knex) => {
  await knex.schema.alterTable('oauth_identities', (t) => {
    t.text('refresh_token').nullable().defaultTo(null);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('oauth_identities', (t) => {
    t.dropColumn('refresh_token');
  });
};
