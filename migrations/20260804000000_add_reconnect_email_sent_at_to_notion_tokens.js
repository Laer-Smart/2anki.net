exports.up = async (knex) => {
  await knex.schema.alterTable('notion_tokens', (t) => {
    t.timestamp('reconnect_email_sent_at', { useTz: true }).nullable().defaultTo(null);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('notion_tokens', (t) => {
    t.dropColumn('reconnect_email_sent_at');
  });
};
