module.exports.up = async function (knex) {
  await knex.schema.alterTable('ankify_sync_mappings', (table) => {
    table.text('content_hash').nullable();
  });
};

module.exports.down = async function (knex) {
  await knex.schema.alterTable('ankify_sync_mappings', (table) => {
    table.dropColumn('content_hash');
  });
};
