exports.up = async (knex) => {
  await knex.schema.alterTable('emoji_feedback', (t) => {
    t.string('email', 254).nullable().defaultTo(null);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('emoji_feedback', (t) => {
    t.dropColumn('email');
  });
};
