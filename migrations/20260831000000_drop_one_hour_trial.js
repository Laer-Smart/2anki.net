exports.up = async (knex) => {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('trial_started_at');
  });
  await knex.schema.dropTableIfExists('trial_ended_emails');
};

exports.down = async (knex) => {
  await knex.schema.alterTable('users', (t) => {
    t.timestamp('trial_started_at', { useTz: true }).nullable().defaultTo(null);
  });
  await knex.schema.createTable('trial_ended_emails', (table) => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('users').notNullable();
    table.string('token', 128).notNullable().unique();
    table
      .timestamp('sent_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.index(['user_id']);
  });
};
