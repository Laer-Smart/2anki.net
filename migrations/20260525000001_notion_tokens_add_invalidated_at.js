exports.up = function (knex) {
  return knex.schema.table('notion_tokens', function (table) {
    table.timestamp('invalidated_at').nullable().defaultTo(null);
  });
};

exports.down = function (knex) {
  return knex.schema.table('notion_tokens', function (table) {
    table.dropColumn('invalidated_at');
  });
};
