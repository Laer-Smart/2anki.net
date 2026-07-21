exports.up = async (knex) => {
  await knex.schema.createTable('developer_tiers', (t) => {
    t.increments('id').primary();
    t.text('tier_key').notNullable().unique();
    t.text('stripe_product_id').notNullable();
    t.text('stripe_price_id').notNullable();
    t.integer('monthly_card_limit').notNullable();
    t.integer('requests_per_minute').notNullable();
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('api_key_usage', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable();
    t.date('month').notNullable();
    t.integer('cards').notNullable().defaultTo(0);
    t.timestamp('warned_at', { useTz: true });
    t.unique(['user_id', 'month']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('api_key_usage');
  await knex.schema.dropTable('developer_tiers');
};
