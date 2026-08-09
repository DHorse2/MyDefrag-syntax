# Execution Record: Migration Catalog-Found Strings

## Identity

- Run: `20260806-migration-catalog-found-strings`
- Project: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- Agent: Codex, primary agent
- Completed: 2026-08-06T19:27:07-07:00

## Input and Scope

The user requested that the Language Maintenance **Migration candidates**
window show detected source strings already present in the component catalog as
well as potential migration candidates. The purpose is to help a human analyst
review catalog coverage without losing source context.

No live generated-output rebuild, catalog-source write, package, commit, or
publication was performed.

## Startup and Authority

- This task continued in the initialized run, so startup documents were not
  loaded again.
- The prior startup reached the Execution Cut-Off.
- The user's explicit **DO NOW** authorized implementation.

## Diagnosis and Decisions

- `buildMigrationReport()` previously removed exact catalog-text matches before
  writing `migration-report.json`; the UI could not recover or display them.
- Exact text matching was preserved as the established catalog-coverage rule.
- Potential and found strings have independent 200-row limits so known strings
  cannot crowd unresolved candidates out of the report.
- The app reclassifies all reported strings against the current in-memory
  catalog whenever the window opens. Applying a candidate therefore moves it to
  **Found in catalog** without requiring Save or another report build.
- Reports lacking the new found-string collection fail with an explicit rebuild
  instruction instead of silently presenting incomplete coverage.

## Changes

- Added `catalogedStringCount` and `catalogedStrings` to each scanned migration
  report file, including matching catalog key, component, category, and role.
- Updated the human-readable report with separate potential and found sections.
- Extended the maintenance service to dynamically return `candidates` and
  `catalogedStrings` based on the current draft catalog.
- Allowed **Open source** for both groups while catalog-key suggestion remains
  limited to potential candidates.
- Updated the resizable modal with separate **Potential candidates** and
  **Found in catalog** groups. Found rows display matching keys/components.
- Updated layout styles, deterministic service/report/UI tests, and workflow
  documentation.

## Files Changed

- `build/language/scripts/build-language.js`
- `build/language/scripts/test-language-report.js`
- `build/language/app/services/language-maintenance-service.js`
- `build/language/app/renderer/app.js`
- `build/language/app/renderer/styles.css`
- `build/language/app/tests/language-maintenance-service.test.js`
- `build/language/app/tests/ui-security.test.js`
- `docs/language-maintenance-app.md`
- This execution record.

## Validation

- JavaScript syntax checks for generator, service, renderer, and changed tests:
  exit 0.
- Initial Language Maintenance run: 43 passed and 1 failed because a test still
  expected the candidate-only source-navigation error. The expected message was
  updated to the new reported-string contract.
- Final `npm run test:language-app`: 44 passed, 0 failed.
- `npm run test:language-report`: passed.
- `npm run language:validate`: 0 errors and the established metadata-only
  `fr-CA` warning.
- Tests use temporary repositories; live catalog and report writes: 0.

## Outcome and Boundaries

Migration candidates now includes exact source-string matches already found in
the current catalog and retains the existing potential-candidate workflow. A
full application restart is required. The analyst must run Rebuild once to
replace the old `migration-report.json` with the new found-string data before
opening the window.

