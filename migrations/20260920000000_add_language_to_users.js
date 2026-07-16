module.exports.up = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.string('language', 8).nullable();
  });
};

module.exports.down = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('language');
  });
};
