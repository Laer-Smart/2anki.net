exports.up = async (knex) => {
  await knex.schema.createTable('error_events', (t) => {
    t.bigIncrements('id').primary();
    t.string('source', 10).notNullable().checkIn(['web', 'server']);
    t.char('message_hash', 64).notNullable();
    t.text('message').notNullable();
    t.text('stack').nullable();
    t.text('url').nullable();
    t.text('user_agent').nullable();
    t.string('release', 40).nullable();
    t.integer('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.char('ip_hash', 64).nullable();
    t.jsonb('context').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['message_hash'], 'error_events_message_hash_idx');
    t.index(['created_at'], 'error_events_created_at_idx');
    t.index(['source', 'created_at'], 'error_events_source_created_at_idx');
  });

  await knex.schema.raw(
    `CREATE INDEX error_events_user_id_partial_idx ON error_events (user_id) WHERE user_id IS NOT NULL`
  );
};

exports.down = async (knex) => {
  await knex.schema.dropTable('error_events');
};
