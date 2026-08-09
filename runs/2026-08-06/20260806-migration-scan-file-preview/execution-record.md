# Execution Record: Migration Scan File Preview

## Summary

Added a non-mutating **Scan file** workflow to the Language Maintenance
Migration Inventory. The workflow uses the builder's exported
`extractStringCandidates` implementation, displays current potential and
catalog-found classifications, and adds the selected file to the in-memory
source inventory only after an explicit analyst action.

## Startup continuity

- Continued the initialized ad hoc Language Maintenance run after its recorded
  Execution Cut-Off.
- The user explicitly authorized immediate execution with **Do now**.
- Existing workspace changes were preserved. Relevant application and
  documentation paths remain untracked in the current worktree.

## Observable actions

1. Traced `buildMigrationReport`, `extractStringCandidates`, the maintenance
   service, IPC contract, sandboxed preload, Migration Inventory renderer, and
   existing regression coverage.
2. Added narrow IPC operations for selecting and scanning one repository file
   and for explicitly adding its normalized repository-relative path.
3. Added service-side scanning through the builder export and classified the
   result against the current in-memory catalog.
4. Added a resizable modal scan window with a native file chooser, component
   selector, source-ordered results, status badges, full source lines, and an
   **Add to source files** action.
5. Factored shared dialog controls, candidate ordering, and candidate content
   into reusable renderer helpers used by both candidate windows.
6. Added service, IPC, preload-contract, and renderer-structure assertions and
   updated the Language Maintenance documentation.
7. Replaced fixed project-root defaults in both migration file choosers with a
   shared session-level last-selected directory. The first selection still
   starts at the project root; later Add files and Scan file dialogs reopen in
   the most recently selected file's folder.

## Files changed

- `build/language/app/shared/contracts.js`
- `build/language/app/preload/preload.js`
- `build/language/app/main/ipc-handlers.js`
- `build/language/app/services/language-maintenance-service.js`
- `build/language/app/renderer/app.js`
- `build/language/app/renderer/styles.css`
- `build/language/app/tests/language-maintenance-service.test.js`
- `build/language/app/tests/ui-security.test.js`
- `docs/language-maintenance-app.md`

## Validation

- JavaScript syntax checks passed for renderer, service, IPC handlers, preload,
  shared contracts, and the edited service test.
- `npm run test:language-app`: passed, 45 tests, 0 failures.
- `npm run test:language-report`: passed.
- `npm run language:validate`: passed with 0 errors and the established single
  `fr-CA` metadata-only fallback warning.
- Deterministic trailing-whitespace check over all edited source and
  documentation files: 0 issues.

## Write boundaries

- Scanning reads the selected repository file and does not mutate draft or
  authoritative state.
- **Add to source files** changes only the in-memory migration inventory; the
  existing Save workflow is still required to write
  `language/canonical/components.json`.
- No language build, report regeneration, live catalog write, package build,
  install, or GUI launch was performed.
