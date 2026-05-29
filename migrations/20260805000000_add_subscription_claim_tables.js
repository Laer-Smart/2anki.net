exports.up = async (knex) => {
  await knex.schema.createTable('subscription_claim_tokens', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('stripe_customer_id', 255).notNullable();
    t.string('token_hash', 255).notNullable().unique();
    t.timestamp('expires_at').notNullable();
    t.timestamp('consumed_at').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id', 'expires_at']);
  });

  await knex.schema.createTable('subscription_claim_audit', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable();
    t.string('email_hash', 255).notNullable();
    t.string('ip_hash', 255).notNullable();
    t.string('outcome', 64).notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id', 'created_at']);
  });

  const result = await knex.raw(`
    SELECT COUNT(*) as cnt
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'users'
      AND tc.constraint_name = 'users_stripe_customer_id_unique'
      AND tc.constraint_type = 'UNIQUE'
  `);

  if (Number(result.rows[0].cnt) === 0) {
    await knex.raw(`
      ALTER TABLE users
      ADD CONSTRAINT users_stripe_customer_id_unique
      UNIQUE (stripe_customer_id)
    `);
  }
};

exports.down = async (knex) => {
  await knex.raw(`
    ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_stripe_customer_id_unique
  `);
  await knex.schema.dropTableIfExists('subscription_claim_audit');
  await knex.schema.dropTableIfExists('subscription_claim_tokens');
};
