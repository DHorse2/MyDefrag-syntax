# Execution Record: Locale Human Translation Workflow

## Table of Contents

- [Identity](#identity)
- [Input and Scope](#input-and-scope)
- [Startup](#startup)
- [Diagnosis and Decisions](#diagnosis-and-decisions)
- [Changes](#changes)
- [Files Changed](#files-changed)
- [Commands and Validation](#commands-and-validation)
- [Outcome and Boundaries](#outcome-and-boundaries)
- [Metrics](#metrics)

## Identity

- Run: `20260806-locale-human-translation-workflow`
- Project: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- Agent: Codex, primary agent
- Completed: 2026-08-06T17:50:23-07:00

## Input and Scope

The user requested a human-centered Locale Maintenance editor flow: display
lossless normalized English below canonical English; let English and normalized
buttons populate **Current locale value**; submit that current value to DeepL;
replace the field with the result; preserve the explicit in-memory apply step.
During execution, the user also reported hangs after build cancellation and
after accepting **Exit without saving**.

No live locale source, generated catalog, API translation, packaging, commit,
or publication was authorized. Tests used temporary fixtures and stubbed API
responses.

## Startup

- Read the machine process-launcher policy first and used `cmd.exe /d /s /c`
  for startup reads.
- Read the execution-record procedure, `Start_Here.md`, project identity,
  directive vocabulary, Instructions, Software Engineer role, Test Engineer
  role, execution-record standard, and global Markdown standard.
- `Resolve-AiTaskQueue.ps1` returned `Idle` and wrote the normal project idle
  current-task state and backup.
- Reached the Execution Cut-Off and continued only after `DO NOW`.

## Diagnosis and Decisions

- The normalized display uses the same `normalizeText()` implementation and
  `preserveRuntimeSyntax: true` mode used by the language build.
- Fallback buttons change only the visible current-value field. The analyst
  must still choose **Apply in memory**, preserving the human review boundary.
- DeepL now receives only the current field plus required placeholders. A
  successful response replaces that field and is also retained in the latest
  result display. The older replacement service contract remains available for
  compatibility but is no longer a separate renderer action.
- Cancellation previously trusted `child.kill()` and waited indefinitely for
  `close`. It now requests termination, force-stops after 2 seconds, and
  resolves after a further 3-second bound if no close event arrives, allowing
  rollback to proceed.
- Exit was guarded twice. The main process displayed the native confirmation,
  then the renderer `beforeunload` handler vetoed the confirmed close. The
  renderer veto was removed; main-process dirty/build protection remains.

## Changes

- Added `normalizedText` to every locale editor row.
- Added the read-only **Normalized English** field immediately below canonical
  English.
- Added **Use Normalized English** below **Use English fallback**; both populate
  **Current locale value** without changing the draft.
- Changed API translation input and output to the current-value field and
  rejected empty input locally.
- Removed the redundant renderer **Replace current value** action while
  retaining the underlying compatibility API.
- Added bounded cancellation escalation and removed duplicate exit vetoing.
- Updated deterministic service, renderer, IPC-exit, and cancellation tests.
- Updated the workflow documentation and added its required table of contents.

## Files Changed

- `build/language/app/services/build-integration.js`
- `build/language/app/tests/repository-build-integration.test.js`
- `build/language/locale-app/services/locale-maintenance-service.js`
- `build/language/locale-app/renderer/index.html`
- `build/language/locale-app/renderer/app.js`
- `build/language/locale-app/renderer/ui-state.js`
- `build/language/locale-app/tests/locale-maintenance-service.test.js`
- `build/language/locale-app/tests/ui-security.test.js`
- `docs/locale-maintenance-app.md`
- This execution record.

## Commands and Validation

- Memory registry search: exit 0; located prior Locale Maintenance and
  normalized-build contracts.
- Initial focused tests after implementation: exit 1 with two test-only
  mismatches: the selected fixture normalized to `Open Preview`, and a static
  assertion still expected the removed authored-only fallback behavior. Both
  expectations were corrected to the requested workflow.
- JavaScript syntax checks for the modified service, renderer, UI helper, and
  build integration: exit 0.
- Final `npm run test:locale-app`: exit 0, 35 passed, 0 failed.
- Final `npm run test:language-app`: exit 0, 43 passed, 0 failed. This includes
  a child that never emits `close` after termination signals and verifies the
  bounded cancellation fallback.
- `npm run language:validate`: exit 0, 0 errors and the established metadata-only
  `fr-CA` warning.
- Markdown lint for the workflow document and the initial execution-record
  revision: exit 0, 0 issues.
- A redundant follow-up `npx` lint after an evidence-only record edit produced
  no output and was terminated after approximately 30 seconds rather than
  retried. Deterministic whitespace and 120-column checks were used afterward.
- Scoped `git diff --check`: exit 0, no whitespace errors.

## Outcome and Boundaries

The source now implements the requested analyst workflow and both reported hang
repairs. The user-cancelled application process was not reused. No live
graphical click-through or package rebuild was performed; a running or packaged
copy must be restarted/rebuilt to load the changes.

## Metrics

- Locale Maintenance tests: 35 passed, 0 failed.
- Language Maintenance regression tests: 43 passed, 0 failed.
- Language validation: 0 errors, 1 warning.
- Markdown lint: 0 issues.
- Live language/catalog writes: 0.
