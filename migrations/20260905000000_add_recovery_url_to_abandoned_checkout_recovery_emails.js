exports.up = async (knex) => {
  await knex.schema.alterTable('abandoned_checkout_recovery_emails', (t) => {
    t.text('recovery_url').nullable().defaultTo(null);
    t.timestamp('recovery_url_expires_at', { useTz: true }).nullable().defaultTo(null);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('abandoned_checkout_recovery_emails', (t) => {
    t.dropColumn('recovery_url');
    t.dropColumn('recovery_url_expires_at');
  });
};
