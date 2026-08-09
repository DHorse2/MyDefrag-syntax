# Execution Record - Language Maintenance Layout and Locales

## Table of Contents

- [Run](#run)
- [Task](#task)
- [Inputs and Scope](#inputs-and-scope)
- [Startup and Loaded Documents](#startup-and-loaded-documents)
- [Actions and Decisions](#actions-and-decisions)
- [Commands and Results](#commands-and-results)
- [Files Changed](#files-changed)
- [Validation](#validation)
- [Outcome and Follow-Up](#outcome-and-follow-up)
- [Metrics](#metrics)

## Run

- Execution ID: `20260807-1100-codex-language-maintenance-locales`
- Date: `2026-08-07`
- Agent: Codex, Software Engineer role
- Computer: `MDM-TJ9DTHV`
- Project ID: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- AI root: `D:\AI\.AI`

## Task

Move the Language Maintenance action buttons directly below the navigation
buttons and add locale-registry maintenance with generated catalog preservation
as the deletion default.

## Inputs and Scope

- Direct user request ending in `Do now`.
- Existing Electron application under `build/app`.
- Locale registry at `language/locales/locales.json`.
- Generated catalogs under `build/language/catalogs`.
- Existing unrelated working-tree changes were preserved.

## Startup and Loaded Documents

- Read the machine process-launcher policy and used `cmd.exe /d /s /c` for
  startup reads.
- Read `Execution_Record.proc.md`, `Start_Here.md`,
  `AI_Directive_Vocabulary.md`, the project identity, and the resolved current
  task state.
- The resolver reported an idle project queue and wrote an idle current-task
  state with one backup. The direct request remained the active task.
- Read `Instructions.md`, `Software_Engineer.role.md`, `Validation.proc.md`,
  `Execution_Record_Standard.md`, and the Global Markdown Standard.

## Actions and Decisions

- Diagnosed `.sidebar-actions { margin-top: auto; }` as the bottom-alignment
  cause and replaced it with a small fixed separation below navigation.
- Added a Locales navigation view with add, edit, and delete operations.
- Kept existing locale IDs immutable and kept required locale `en`
  undeletable.
- Added locale metadata to draft comparison, validation, Revert, Save, and
  reload state.
- Made locale registry membership authoritative for optional locales. Authored
  directories for unregistered locales are preserved, inactive, and warned.
- Implemented a native delete prompt with `Keep catalog (recommended)` as the
  default, `Delete catalog on Save` as explicit opt-in, and Cancel.
- Staged opt-in generated-catalog deletion by rename outside the generated
  catalog tree. Save commits it only after a successful build and restores it
  after failure.
- Did not edit or regenerate live locale catalogs.

## Commands and Results

- Startup policy and document reads through `cmd.exe`: exit `0`.
- `Resolve-AiTaskQueue.ps1 -ProjectRoot D:\Script\MyDefrag-syntax`: exit `0`,
  idle queue state.
- JavaScript syntax checks for six changed runtime files: all exit `0`.
- `npm run test:language-app`: exit `0`, 48 passed and 0 failed.
- `npm run language:validate`: exit `0`, 0 errors and 1 existing metadata-only
  locale warning.
- `npm run test:language-report`: exit `0`.
- `npx --yes markdownlint-cli2` for both changed documents: exit `0`, 0 issues.
- `npx --yes markdownlint-cli2` for this execution record: exit `0`, 0 issues.
- `git diff --check` for the changed scope: exit `0`.
- `npm run test:language`: exit `1`; the current generated runtime catalog has
  `BEGIN [depth 2]` while the existing test expects `BEGIN [depth:2]`.

## Files Changed

- `build/app/renderer/index.html`
- `build/app/renderer/styles.css`
- `build/app/renderer/app.js`
- `build/app/shared/contracts.js`
- `build/app/preload/preload.js`
- `build/app/main/ipc-handlers.js`
- `build/app/services/language-maintenance-service.js`
- `build/app/repositories/canonical-data-repository.js`
- `build/app/tests/language-maintenance-service.test.js`
- `build/app/tests/ui-security.test.js`
- `build/scripts/build-language.js`
- `docs/language-maintenance-app.md`
- `docs/build-language.md`
- This execution record.

## Validation

- Requested layout behavior: pass by DOM order, CSS regression assertion, and
  absence of auto-margin bottom alignment.
- Locale add/edit/delete behavior: pass.
- Default generated-catalog preservation: pass.
- Explicit catalog deletion and failed-build rollback: pass in disposable
  fixtures.
- Authored locale-directory preservation: pass in disposable fixtures.
- Live language validation: pass.
- Live graphical launch and packaged installer rebuild: not performed.

## Outcome and Follow-Up

- Outcome: requested source changes completed and focused validation passed.
- Unresolved unrelated diagnostic: the broader runtime test catalog-text
  mismatch remains for separate investigation.
- Follow-up: rebuild/package the desktop executable only if a distributable
  artifact is required.

## Metrics

- Application tests: 48 passed, 0 failed.
- Language validation: 0 errors, 1 warning.
- Markdown lint: 0 issues.
- Changed implementation, test, and documentation files: 13.
