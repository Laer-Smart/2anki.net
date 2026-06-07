module.exports.up = async function (knex) {
  await knex.schema.alterTable('access_tokens', (table) => {
    table.dropUnique(['owner']);
    table.index('owner');
    table.index('token');
  });
};

module.exports.down = async function (knex) {
  await knex.raw(`
    DELETE FROM access_tokens a
    USING access_tokens b
    WHERE a.owner = b.owner
      AND (a.created_at < b.created_at
        OR (a.created_at = b.created_at AND a.ctid < b.ctid))
  `);
  await knex.schema.alterTable('access_tokens', (table) => {
    table.dropIndex('owner');
    table.dropIndex('token');
    table.unique(['owner']);
  });
};
