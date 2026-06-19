// Widen error_events.release from varchar(40) to varchar(64) so a full
// TrunkVer (timestamp.0.0-g<sha>-<buildref>, ~44 chars with a 12-char short
// sha) fits without truncating its build reference — the part that links an
// error group back to its build log. Increasing a varchar length limit is a
// metadata-only change in Postgres (no table rewrite, no lock of note).
exports.up = async (knex) => {
  await knex.schema.alterTable('error_events', (t) => {
    t.string('release', 64).nullable().alter();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('error_events', (t) => {
    t.string('release', 40).nullable().alter();
  });
};
