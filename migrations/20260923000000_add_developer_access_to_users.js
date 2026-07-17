module.exports.up = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.boolean('developer_access').notNullable().defaultTo(false);
  });
};

module.exports.down = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('developer_access');
  });
};
