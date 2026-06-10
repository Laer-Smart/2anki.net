exports.up = (knex) =>
  knex.schema.createTable('price_lock_in_emails', (table) => {
    table.increments('id').primary();
    table
      .integer('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('token', 128).notNullable().unique();
    table.string('variant', 1).notNullable();
    table
      .timestamp('sent_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.index(['user_id'], 'price_lock_in_emails_user_id_idx');
  });

exports.down = (knex) => knex.schema.dropTableIfExists('price_lock_in_emails');
