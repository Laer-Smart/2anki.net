exports.up = async (knex) => {
  await knex.schema.createTable('anonymous_passes', (t) => {
    t.increments('id').primary();
    t.text('stripe_session_id').notNullable();
    t.text('kind').notNullable();
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.text('payment_intent_id').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['stripe_session_id'], {
      indexName: 'anonymous_passes_stripe_session_id_uniq',
    });
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('anonymous_passes');
};
