exports.up = async (knex) => {
  await knex.schema.createTable('apple_transactions', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('transaction_id').notNullable().unique();
    t.text('product_id').notNullable();
    t.text('environment').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.raw(
    'CREATE INDEX idx_apple_transactions_user ON apple_transactions (user_id)'
  );
};

exports.down = async (knex) => {
  await knex.schema.dropTable('apple_transactions');
};
