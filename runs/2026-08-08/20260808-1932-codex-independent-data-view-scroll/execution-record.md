# Execution Record - Independent Data View Scroll

## Run

- Execution ID: `20260808-1932-codex-independent-data-view-scroll`
- Date: `2026-08-08`
- Agent: Codex, Debugger role
- Computer: `MDM-TJ9DTHV`
- Project ID: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- AI root: `D:\AI\.AI`

## Task

Prevent the Component Catalog list from jumping to the top when editing a
record, make the list and editor independent, and fill the available screen
height with the list panel.

## Startup

- Reused the startup documents already loaded once for this run, including the
  launcher policy, Debugger role, validation guidance, and execution record
  procedure.
- Used the direct implementation request as the active task after the execution
  cut-off.

## Root Cause

Selecting a record replaced only the editor, but Apply and Clear rebuilt the
complete data view without restoring the table wrapper's scroll offset. The
list had a conservative viewport-based maximum height, while the editor grew
with document content, so the two panels did not own independent scrolling and
the list left substantial screen space unused.

## Actions and Decisions

- Added list-scroll storage keyed by maintenance view, component scope, and
  search text.
- Restored the matching list position whenever a data view is rebuilt.
- Preserved the live table offset while swapping an editor after row selection.
- Added explicit list and editor panel classes with independent overflow.
- Assigned the remaining desktop viewport height to the split data view.
- Allowed the table wrapper to fill its list card instead of retaining the
  previous `calc(100vh - 300px)` maximum.
- Retained bounded, single-column behavior below the existing responsive
  breakpoint.
- Applied the behavior to every schema-driven maintenance view so their scroll
  positions remain independent.
- Updated static regression assertions and the Language Maintenance guide.
- Preserved unrelated working-tree changes and generated data.

## Commands and Results

- Renderer JavaScript syntax check: exit `0`.
- Initial focused UI run: 10 passed and 1 stale static assertion failed because
  the editor replacement now uses the independent-editor helper.
- Updated that assertion to the new structure.
- Corrected focused UI run: exit `0`, 11 passed and 0 failed.
- `npm run test:language-app`: exit `0`, 60 passed and 0 failed.
- `npm run test:language-report`: exit `0`.
- `npm run language:validate`: exit `0`, 0 errors and 1 existing warning for
  metadata-only `fr-CA` fallback.

## Files Changed

- `build/app/renderer/app.js`
- `build/app/renderer/styles.css`
- `build/app/tests/ui-security.test.js`
- `docs/language-maintenance-app.md`
- This execution record.

## Validation

- Component Catalog list retains its offset during row selection: pass.
- Apply, Clear, and other full data-view renders restore the keyed offset: pass.
- List and editor panes scroll independently: pass.
- Desktop list panel fills the remaining viewport height: pass.
- Responsive single-column list remains bounded: pass.
- Full Language Maintenance regression suite: pass.

## Outcome and Metrics

- Outcome: requested independent Component Catalog list behavior completed.
- Automated application tests: 60 passed, 0 failed.
