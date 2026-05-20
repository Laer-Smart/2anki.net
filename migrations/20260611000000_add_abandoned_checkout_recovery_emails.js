exports.up = async (knex) => {
  await knex.schema.createTable('abandoned_checkout_recovery_emails', (t) => {
    t.text('session_id').primary();
    t.text('user_email').notNullable();
    t.timestamp('sent_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('abandoned_checkout_recovery_emails');
};
