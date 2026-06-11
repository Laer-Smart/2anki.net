module.exports.up = async function (knex) {
  await knex.raw(`
    DELETE FROM settings a
    USING settings b
    WHERE a.owner = b.owner
      AND a.object_id = b.object_id
      AND a.id < b.id
  `);
  await knex.schema.alterTable('settings', (table) => {
    table.dropUnique(['object_id']);
    table.unique(['owner', 'object_id']);
  });
};

module.exports.down = async function (knex) {
  await knex.raw(`
    DELETE FROM settings a
    USING settings b
    WHERE a.object_id = b.object_id
      AND a.id < b.id
  `);
  await knex.schema.alterTable('settings', (table) => {
    table.dropUnique(['owner', 'object_id']);
    table.unique(['object_id']);
  });
};
