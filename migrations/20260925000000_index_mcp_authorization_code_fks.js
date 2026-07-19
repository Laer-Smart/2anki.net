module.exports.up = async function (knex) {
  await knex.schema.alterTable('mcp_authorization_codes', (table) => {
    table.index(['user_id'], 'mcp_authorization_codes_user_id_idx');
    table.index(['client_id'], 'mcp_authorization_codes_client_id_idx');
  });
};

module.exports.down = async function (knex) {
  await knex.schema.alterTable('mcp_authorization_codes', (table) => {
    table.dropIndex(['user_id'], 'mcp_authorization_codes_user_id_idx');
    table.dropIndex(['client_id'], 'mcp_authorization_codes_client_id_idx');
  });
};
