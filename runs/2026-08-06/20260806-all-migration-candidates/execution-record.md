# Execution Record: All Migration Candidates

## Identity

- Run: `20260806-all-migration-candidates`
- Project: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- Agent: Codex, primary agent
- Completed: 2026-08-06T21:12:01-07:00

## Input and Scope

The user requested a semantic change to the Language Maintenance candidate
window: replace separate Potential and Found groups with one **All Candidates**
list whose rows have either **In Catalog** or **Potential Candidate** status.
The user confirmed the Migration Inventory source-file list was already good.

No catalog source, generated output, package, commit, or publication was
written.

## Startup and Authority

- This task continued in the initialized run, so startup documents were not
  loaded again.
- The prior startup reached the Execution Cut-Off.
- The user's explicit **Do Now** authorized implementation.

## Decisions

- The modal combines both service collections and sorts the result by source
  line, then text, so status does not disturb source review order.
- **Potential Candidate** preserves the existing Component Catalog Add Record
  workflow and key suggestion.
- **In Catalog** is not offered as a duplicate Add Record. Selecting it opens a
  read-only Catalog Matches panel listing each key, component, category, and
  role.
- Every row retains the full source line and **Open source** action.
- Migration Inventory counts remain unchanged because the user accepted that
  screen.

## Changes

- Renamed the modal title and list heading to **All Candidates**.
- Combined potential and cataloged strings into one source-ordered list.
- Added visible **Potential Candidate** and **In Catalog** status badges.
- Retained catalog key/component details on In Catalog rows.
- Added the Catalog Matches detail panel and top **Close candidates** action.
- Updated row styling, renderer contract assertions, and documentation.

## Files Changed

- `build/language/app/renderer/app.js`
- `build/language/app/renderer/styles.css`
- `build/language/app/tests/ui-security.test.js`
- `docs/language-maintenance-app.md`
- This execution record.

## Validation

- Renderer JavaScript syntax check: exit 0.
- `npm run test:language-app`: 44 passed, 0 failed.
- `npm run test:language-report`: passed.
- `npm run language:validate`: 0 errors and the established metadata-only
  `fr-CA` warning.
- Live generated-output and catalog writes: 0.

## Outcome and Boundaries

The candidate modal now represents every reported string as one candidate with
an explicit catalog status. A full Electron process restart is required to load
the current renderer; a packaged copy must be rebuilt and reinstalled.

