exports.up = async (knex) => {
  await knex.schema.alterTable('uploads', (t) => {
    t.text('source').nullable().defaultTo(null);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('uploads', (t) => {
    t.dropColumn('source');
  });
};
