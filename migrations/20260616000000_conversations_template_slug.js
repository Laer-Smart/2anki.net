exports.up = async (knex) => {
  await knex.schema.alterTable('conversations', (t) => {
    t.text('template_slug').nullable().defaultTo(null);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('conversations', (t) => {
    t.dropColumn('template_slug');
  });
};
