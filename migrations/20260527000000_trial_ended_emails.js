exports.up = (knex) =>
  knex.schema.createTable('trial_ended_emails', (table) => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('users').notNullable();
    table.string('token', 128).notNullable().unique();
    table
      .timestamp('sent_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.index(['user_id']);
  });

exports.down = (knex) =>
  knex.schema.dropTableIfExists('trial_ended_emails');
