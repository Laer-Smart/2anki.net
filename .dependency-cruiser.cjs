/**
 * Architecture-fitness sensor for src/.
 *
 * Turns the layering rules in .claude/rules/code-quality.md (until now prose
 * the agent could only be *told* to follow) into a computational check that
 * fires in `pnpm arch`, `/check`, and CI.
 *
 * Severity is calibrated against the code as it exists today:
 *   - `error`  — invariants that are clean now; a new violation fails the build.
 *   - `warn`   — real existing debt; surfaced (with a count) so it stops growing
 *                silently, but does not block until it is paid down. dependency-cruiser
 *                exits non-zero only on `error`, so warns report without breaking CI.
 *
 * Measured on 2026-06-18 (branch chore/harness-engineering-controls):
 *   knex value-import outside data_layer: 0 (conversionPool — allowlisted infra)
 *   circular dependencies:                27 (mostly hubbed on data_layer/index.ts)
 *   data_layer importing upward:          2  (data_layer/index.ts wiring barrel)
 *   routes/controllers -> data_layer:     ~447 import edges (warn — debt frozen,
 *     not blocked; new code should go through a use case or service).
 */
module.exports = {
  forbidden: [
    {
      name: 'no-knex-value-outside-datalayer',
      comment:
        'Only the data layer may import the knex query builder as a value. Elsewhere, take a repository in the constructor (testable, no SQL leakage). `import type { Knex }` for typing a constructor param is allowed everywhere.',
      severity: 'error',
      from: {
        pathNot: [
          '^src/data_layer',
          '^src/KnexConfig\\.ts$',
          '^src/lib/conversionPool\\.ts$',
          '^src/seeds',
          '^src/migrations',
        ],
      },
      to: {
        path: 'node_modules/knex',
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'no-circular',
      comment:
        'Circular dependency between modules. Break the cycle — extract the shared piece or invert one direction. 27 existing cycles cluster on the data_layer/index.ts barrel; surfaced as warn so the count cannot grow unnoticed.',
      severity: 'warn',
      from: {},
      to: { circular: true },
    },
    {
      name: 'data-layer-is-leaf',
      comment:
        'The data layer is a leaf: it must not import routes, controllers, or use cases. The data_layer/index.ts wiring barrel is the source of most of the circular dependencies above. New repositories must not add to it.',
      severity: 'warn',
      from: { path: '^src/data_layer' },
      to: { path: '^src/(routes|controllers|usecases)' },
    },
    {
      name: 'no-layer-skip-to-data-layer',
      comment:
        'Route -> controller -> use case -> service -> data layer. Routes and controllers should not reach into data_layer directly. ~447 existing skip edges document the debt; surfaced as warn so the count is visible and new code goes through a use case or service instead of growing it.',
      severity: 'warn',
      from: { path: '^src/(routes|controllers)' },
      to: { path: '^src/data_layer' },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
    // `\\.js$` keeps the cruise on TypeScript only — `tsx`/`build` leave stale
    // compiled .js in src/ (see the `purge-js`/`dev-cleanup` scripts) that would
    // otherwise double-count every module locally.
    exclude: { path: '\\.test\\.ts$|\\.js$|/test/|/__mocks__/|/migrations/' },
  },
};
