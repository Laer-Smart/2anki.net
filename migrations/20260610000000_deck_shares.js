exports.up = async (knex) => {
  await knex.schema.createTable('deck_shares', (t) => {
    t.increments('id').primary();
    t.integer('owner').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('upload_key', 512).notNullable();
    t.string('token', 36).notNullable().unique();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('revoked_at', { useTz: true }).nullable();
    t.integer('view_count').notNullable().defaultTo(0);
    t.index(['owner'], 'deck_shares_owner_idx');
    t.index(['token'], 'deck_shares_token_idx');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('deck_shares');
};
