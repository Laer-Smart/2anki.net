module.exports.up = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.boolean('ankify_access').notNullable().defaultTo(false);
  });
};

module.exports.down = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('ankify_access');
  });
};
