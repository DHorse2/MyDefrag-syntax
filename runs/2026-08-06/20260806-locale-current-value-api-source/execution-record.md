# Execution Record: Locale Current-Value API Source

## Identity

- Run: `20260806-locale-current-value-api-source`
- Project: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- Agent: Codex, primary agent
- Completed: 2026-08-06T17:59:00-07:00

## Input and Scope

The user reported that **Generate API translation** used an earlier value after
**Use Normalized English** visibly populated **Current locale value**. The
requested invariant is that the API receives exactly the value displayed in
that field when generation is selected.

No live API request, locale-source edit, generated-catalog write, packaging,
commit, or publication was authorized. Tests used temporary fixture
repositories and stubbed translation responses.

## Startup

- Read the machine launcher policy first and used its required `cmd.exe`
  startup path.
- Read the execution-record procedure, `Start_Here.md`, project identity,
  directive vocabulary, applicable instructions, roles, procedures, and
  standards.
- The task resolver returned `Idle` and wrote its normal idle current-task
  state and backup.
- The user's explicit **Do Now** authorized execution after the Execution
  Cut-Off.

## Diagnosis and Decisions

- The renderer-to-preload-to-IPC path accepts a supplied `text` property, and
  the current service implementation translates that supplied property.
- The observed combination of a newly rendered normalized value and an older
  translation source is consistent with a mixed-version Electron process: a
  refreshed renderer can coexist with a main process that has not reloaded.
  This is an inference from the source path, not a live-process observation.
- The repair is fail-safe: capture the visible field before changing UI state,
  return the exact translated source from the main process, and refuse to apply
  a response unless that source matches the submitted current value.

## Changes

- Captured **Current locale value** into one request-local value before the
  Generate button is disabled or status text changes.
- Sent that captured value as the API translation input.
- Added `sourceText` to successful main-process translation responses.
- Added a renderer source-match guard. A mismatched response leaves the current
  field unchanged and instructs the analyst to restart Locale Maintenance.
- Added service, renderer, IPC, and helper regression assertions.
- Documented the source verification and full-process restart requirement.

## Files Changed

- `build/language/locale-app/services/locale-maintenance-service.js`
- `build/language/locale-app/renderer/app.js`
- `build/language/locale-app/renderer/ui-state.js`
- `build/language/locale-app/tests/locale-maintenance-service.test.js`
- `build/language/locale-app/tests/ui-security.test.js`
- `docs/locale-maintenance-app.md`
- This execution record.

## Commands and Validation

- JavaScript syntax checks for the service, renderer, and UI helper: exit 0.
- `npm run test:locale-app`: exit 0, 35 passed and 0 failed.
- `npm run test:language-app`: exit 0, 43 passed and 0 failed.
- `npm run language:validate`: exit 0, 0 errors and the established
  metadata-only `fr-CA` warning.
- Markdown lint produced no output and was stopped by its 30-second command
  bound. It was not retried; deterministic checks found no trailing whitespace
  or overlong lines in either changed Markdown file.
- Repository-wide `git diff --check` reported pre-existing whitespace defects
  in unrelated dirty files. The relevant locale-app tree is untracked, so that
  command cannot validate its changes; targeted checks found no new trailing
  whitespace.
- No test invoked the live DeepL API or edited live locale catalogs.

## Outcome and Boundaries

API generation now uses the captured displayed current value and verifies the
main process used the same source before replacing the field. A currently
running Locale Maintenance instance must be exited completely and restarted;
renderer refresh alone does not reload the Electron main process. A packaged
copy must also be rebuilt before it contains this source change.
