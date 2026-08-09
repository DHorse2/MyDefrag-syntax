# Execution Record - Preserve List Scroll on Selection

## Run

- Execution ID: `20260808-1650-codex-preserve-list-scroll-on-selection`
- Date: `2026-08-08`
- Agent: Codex, Debugger role
- Computer: `MDM-TJ9DTHV`
- Project ID: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- AI root: `D:\AI\.AI`

## Task

Prevent Language Maintenance lists from jumping to the top when selecting an
item to display its details.

## Startup

- Reused the startup documents already loaded once for this run, including the
  launcher policy, Debugger role, validation guidance, and execution record
  procedure.
- Used the direct implementation request as the active task after the execution
  cut-off.

## Diagnosis

- Generic schema-backed table rows set the selected identity and called the
  application-wide `render()` function.
- Locale rows called `renderLocalesView()` after selection.
- Both paths removed and recreated the scrollable list, resetting its
  `scrollTop` to zero even though only the adjacent details pane had changed.
- Component and candidate selectors already updated their details panes without
  rebuilding their lists.

## Actions and Decisions

- Changed generic table selection to update selected-row classes and replace
  only the right-hand schema editor.
- Changed Locale selection to update selected-row classes and replace only the
  right-hand locale editor.
- Kept the existing list and table-wrapper nodes mounted, preserving both inner
  list scroll and surrounding workspace position.
- Added regression assertions that selection handlers use in-place editor
  replacement and no longer call full-view render functions.
- Documented the maintained scroll behavior.
- Preserved unrelated working-tree changes and authored data.

## Commands and Results

- Renderer JavaScript syntax check: exit `0`.
- `npm run test:language-app`: exit `0`, 58 passed and 0 failed.
- Markdown lint for the updated guide and this record: exit `0`, 0 issues.

## Files Changed

- `build/app/renderer/app.js`
- `build/app/tests/ui-security.test.js`
- `docs/language-maintenance-app.md`
- This execution record.

## Validation

- Generic catalog-style list selection preserves the list node: pass.
- Locale selection preserves the list node: pass.
- Selected-row highlighting updates without a full render: pass.
- Component and candidate selection behavior remains unchanged: pass.
- Language Maintenance regression suite: pass.

## Outcome and Metrics

- Outcome: requested scroll-position repair completed.
- Automated application tests: 58 passed, 0 failed.
