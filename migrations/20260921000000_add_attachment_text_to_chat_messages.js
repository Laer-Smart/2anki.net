module.exports.up = async function (knex) {
  await knex.schema.alterTable('chat_messages', (table) => {
    table.text('attachment_text').nullable();
  });
};

module.exports.down = async function (knex) {
  await knex.schema.alterTable('chat_messages', (table) => {
    table.dropColumn('attachment_text');
  });
};
