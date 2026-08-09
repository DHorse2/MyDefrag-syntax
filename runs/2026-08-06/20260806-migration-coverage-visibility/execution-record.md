# Execution Record: Migration Coverage Visibility

## Identity

- Run: `20260806-migration-coverage-visibility`
- Project: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- Agent: Codex, primary agent
- Completed: 2026-08-06T20:05:09-07:00

## Input and Scope

The user reported that the new **Potential candidates** and **Found in catalog**
groups were not visible in either the Migration candidates modal or the
Migration Inventory screen.

This follow-up verified the generated report and source renderer, identified a
stale running renderer, and added the missing inventory-level coverage summary.
No catalog source, live generated report, package, commit, or publication was
written.

## Evidence and Diagnosis

- The live `build/language/reports/migration-report.json` already has the new
  title and `catalogedStrings` property for all 8 scanned files.
- The current report contains 589 potential strings and 19 strings found in the
  catalog.
- The source renderer contains both detailed modal headings.
- No `app.asar` or packaged executable was present below the configured
  `artifacts/language-maintenance` output at inspection time.
- Therefore the candidate modal observed by the user was loaded from an older
  running or separately installed renderer.
- The earlier implementation did not place coverage counts on Migration
  Inventory rows; that screen-level expectation was a real missing feature.

## Changes

- Added one `getMigrationSummary` call that reads the report once and returns
  potential/found counts for every inventoried file.
- Reused current in-memory catalog classification, so summary counts track
  applied draft records without Save.
- Added the channel consistently to the shared contract, preload bridge, and
  main-process handler.
- Each Migration Inventory row now shows `N potential - M found in catalog` or
  a visible unavailable/stale-report error.
- Added stale-request protection so an earlier summary response cannot update a
  later render.
- Updated styles, service/IPC/renderer assertions, and documentation.

## Files Changed

- `build/language/app/services/language-maintenance-service.js`
- `build/language/app/shared/contracts.js`
- `build/language/app/preload/preload.js`
- `build/language/app/main/ipc-handlers.js`
- `build/language/app/renderer/app.js`
- `build/language/app/renderer/styles.css`
- `build/language/app/tests/language-maintenance-service.test.js`
- `build/language/app/tests/ui-security.test.js`
- `docs/language-maintenance-app.md`
- This execution record.

## Validation

- JavaScript syntax checks for service, renderer, preload, and IPC handler:
  exit 0.
- `npm run test:language-app`: 44 passed, 0 failed.
- `npm run test:language-report`: passed.
- `npm run language:validate`: 0 errors and the established metadata-only
  `fr-CA` warning.
- Live generated-output and catalog writes: 0.

## Outcome and Boundaries

Current source shows coverage in both requested surfaces. The existing report
already contains the required found-string data. The user must fully exit the
old Electron process and run the current source, or rebuild and reinstall any
packaged copy, for the corrected renderer and new IPC channel to load.

