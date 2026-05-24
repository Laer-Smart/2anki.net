# Jobs use-cases: route DB access through repositories

### Single-investigator synthesis

- **What:** three long-standing TODOs in `src/usecases/jobs/` reach into the DB through ad-hoc helpers instead of injected repositories. All three are real violations of CLAUDE.md's "Never import knex outside `src/data_layer/`" rule. The fix is mechanical because the repositories already exist.
- **Why now:** no user-facing payoff; this is hygiene. But the violations are the kind that quietly invite more bypasses (next person sees `getDatabase()` already imported in a use case and adds one more). Cleaning now keeps the layered architecture readable.
- **Plan:** one PR. Add `SettingsRepository.load(owner, id)`, `ParserRulesRepository.load(owner, id)`, `UsersRepository.getEmailById(id)` (or confirm existing methods cover them), wire them through the use-case constructors at the existing call site in `performConversion.ts`, delete the loose helpers.

## Outcome

Architecture violation cleared. Use cases in `src/usecases/jobs/` no longer import `knex` directly or call DB helpers from `src/lib/`. The hot-path conversion job pipeline is one bypass shorter; future contributors get a clean precedent in the most-edited use-case folder.

No user-visible change. No changelog entry.

## Goal alignment

`src/usecases/CLAUDE.md` ("Use cases … never access the database directly") and `.claude/rules/code-quality.md` ("Do not import knex outside src/data_layer/") are both flatly violated by these two files. The rule exists so tests can inject fakes without spinning a DB and so layer boundaries stay readable. Leaving the violations in the highest-traffic use-case folder undermines both.

## Problem

Two use cases break the layered architecture:

- `CreateJobWorkSpaceUseCase.ts:51` calls `loadSettingsFromDatabase(getDatabase(), owner, id)` — imports knex root + a `src/lib/parser/Settings/` helper.
- `CreateJobWorkSpaceUseCase.ts:56` calls `ParserRules.Load(owner, id)` — `ParserRules` is a domain class, but `Load` internally pulls from the DB without going through `ParserRulesRepository`.
- `NotifyUserUseCase.ts:25` calls `getEmailFromOwner(db, owner)` — takes a `Knex` instance directly, then a `src/lib/User/` helper does the query.

All three have TODO comments left from earlier refactors. `SettingsRepository`, `ParserRulesRepository`, and `UsersRepository` exist; the helpers are doing what should be repo methods.

## Riskiest assumption

The repositories' existing surface already covers what these helpers do — or what's missing is one method each. The smallest test before committing: read the three repositories' current methods and confirm any new method is a 5-line wrapper around existing knex query logic.

## Scope

**In:**
- `SettingsRepository`: add `load(owner: string, id: string): Promise<CardOption>` (or rename existing equivalent) returning the same shape `loadSettingsFromDatabase` returns today.
- `ParserRulesRepository`: add `load(owner: string, id: string): Promise<ParserRules>` returning what `ParserRules.Load` returns today.
- `UsersRepository`: add (or expose) `getEmailById(id: string): Promise<string>` returning what `getEmailFromOwner` returns today.
- `CreateJobWorkSpaceUseCase` constructor: accept `settingsRepository` and `parserRulesRepository`; use them instead of the helpers.
- `NotifyUserUseCase` constructor: accept `usersRepository`; drop the `db: Knex` field from `NotifyUserUseCaseInput`.
- `performConversion.ts` (the wiring site): construct the new repositories from `getDatabase()` and pass them in.
- Delete `loadSettingsFromDatabase` and `getEmailFromOwner` once unused. `ParserRules.Load` stays as a domain method *if* it still has non-DB callers — otherwise inline it into the new repo method.

**Out:**
- Any other use case in `src/usecases/` not on the conversion hot path.
- Renaming the use cases themselves.
- Schema changes / migrations.
- Behavior change: outputs must be byte-identical to today's helpers (assert with the existing use-case tests).

## User story

As a contributor reading `src/usecases/jobs/`, I want each use case to depend only on injected repositories so I can write a unit test without spinning a real DB and trust the layer boundaries.

## Acceptance criteria

- [ ] `CreateJobWorkSpaceUseCase.ts` contains no import of `getDatabase` or `Knex` and no reference to `loadSettingsFromDatabase` or the `ParserRules.Load` static method.
- [ ] `NotifyUserUseCase.ts` contains no import of `Knex` and no reference to `getEmailFromOwner`. `db: Knex` is dropped from `NotifyUserUseCaseInput`.
- [ ] `performConversion.ts` constructs the three repositories once and passes them in.
- [ ] Existing tests for both use cases pass (snapshot the current behavior first; do not modify them to fit the new shape unless they were testing internal details that don't belong in the test).
- [ ] New use-case-level tests inject in-memory fakes of the three repositories and run without a Knex instance — proof that the dependency injection is real.
- [ ] `grep -rn "import.*knex\|import.*Knex" src/usecases` returns zero results.
- [ ] `loadSettingsFromDatabase` and `getEmailFromOwner` are deleted (or only used in `src/data_layer/`).
- [ ] `pnpm test src/usecases/jobs` and `pnpm test src/data_layer` both green; `/check` clean.

## Open questions for the engineer

1. **`ParserRules.Load` static method.** Is it called from anywhere else (rules controllers, web?)? If yes, leave it alone and just route the use case through the repo. If no, move the implementation into `ParserRulesRepository.load` and delete the static.
2. **`SettingsRepository` existing surface.** Read the current methods before adding `load`. If `getByOwnerAndId` already exists, use it and rename for consistency rather than adding a parallel method.
3. **`NotifyUserUseCase` `db: Knex` field.** Callers may already pass it in; the field can be dropped from the constructor input shape but the worker that builds the input also needs updating. Confirm `performConversion.ts` is the only caller before changing the interface.

## Technical pre-flight

**Layers touched:**
- `src/data_layer/SettingsRepository.ts` — add or rename `load` method.
- `src/data_layer/ParserRulesRepository.ts` — add or rename `load` method.
- `src/data_layer/UsersRepository.ts` — add or expose `getEmailById`.
- `src/usecases/jobs/CreateJobWorkSpaceUseCase.ts` — drop helper imports, accept repos in constructor.
- `src/usecases/jobs/NotifyUserUseCase.ts` — drop `Knex` + helper, accept repo.
- `src/lib/storage/jobs/helpers/performConversion.ts` — instantiate the three repos, pass them to the use cases.
- `src/lib/parser/Settings/loadSettingsFromDatabase.ts` — delete.
- `src/lib/User/getEmailFromOwner.ts` — delete.
- `src/lib/parser/ParserRules.ts` — `Load` static stays or goes per open question 1.

**Tests:** new fake repos for each so the use cases run in unit tests without Knex. Existing `*.test.ts` for the use cases pass.

**Security / migration:** none.

**Effort: M** — ~3 hours. Mechanical refactor, three repos × three callers × tests. No new logic.

**Risk:** the only behavioral risk is misreading what `loadSettingsFromDatabase` / `ParserRules.Load` / `getEmailFromOwner` return shapes today. Mitigate by snapshotting outputs in existing tests before the swap.
