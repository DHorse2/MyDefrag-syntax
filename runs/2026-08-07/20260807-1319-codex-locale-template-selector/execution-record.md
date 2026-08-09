# Execution Record - Locale Template Selector

## Run

- Execution ID: `20260807-1319-codex-locale-template-selector`
- Date: `2026-08-07`
- Agent: Codex, Software Engineer role
- Computer: `MDM-TJ9DTHV`
- Project ID: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- AI root: `D:\AI\.AI`

## Task

Use `language/canonical/language-locales.json` as the Add Locale selector and
metadata template, mirroring the Locales table fields in the selector.

## Inputs and Scope

- Direct user request followed by `do now`.
- Existing canonical template file with 15 locale rows.
- Existing active registry with the same 15 locale IDs.
- Existing unrelated working-tree and generated-catalog changes were preserved.

## Startup

- Read the machine launcher policy and used `cmd.exe /d /s /c` for startup.
- Read the required startup, role, validation, and documentation standards.
- The queue resolver returned idle and wrote an idle current-task state with one
  backup. The direct request remained the active task.

## Actions and Decisions

- Added `language-locales.json` to project-root validation.
- Loaded canonical locale templates into the shared language state and exposed
  them in the renderer snapshot without making them editable through Save.
- Added explicit template validation for required fields, identifier format,
  direction, status, and duplicate IDs.
- Added a required Add Locale selector whose options display ID, English name,
  native name, direction, and status in canonical order.
- Kept registered templates visible but disabled and marked them as already
  registered.
- Selecting an available template fills the metadata fields. The locale ID is
  read-only; other metadata remains editable before applying the draft.
- Disabled Add locale submission when every canonical template is registered.
- Updated Language Maintenance and builder documentation.

## Commands and Results

- Startup and configuration reads: exit `0`.
- Project task resolver: exit `0`, idle queue state.
- JavaScript syntax checks for five changed runtime files: exit `0`.
- `git diff --check` for the changed scope: exit `0`.
- `npm run test:language-app`: exit `0`, 49 passed and 0 failed.
- `npm run test:locale-app`: exit `0`, 35 passed and 0 failed.
- `npm run test:language-report`: exit `0`.
- `npm run language:validate`: exit `0`, 0 errors and 1 existing warning.
- Documentation Markdown lint: exit `0`, 0 issues.
- Execution-record Markdown lint: exit `0`, 0 issues.

## Files Changed

- `build/app/main/project-root.js`
- `build/app/repositories/canonical-data-repository.js`
- `build/app/services/language-maintenance-service.js`
- `build/app/renderer/app.js`
- `build/app/tests/language-maintenance-service.test.js`
- `build/app/tests/ui-security.test.js`
- `build/scripts/build-language.js`
- `docs/language-maintenance-app.md`
- `docs/build-language.md`
- This execution record.

## Validation

- Canonical templates load into application state: pass.
- Selector mirrors all five requested locale fields: pass.
- Registered choices remain visible and disabled: pass.
- Available selection populates the form and preserves template ID: pass.
- Invalid and duplicate canonical templates are rejected: pass.
- Existing Language and Locale Maintenance regression suites: pass.
- Live language validation: pass.
- Live graphical launch and packaged installer rebuild: not performed.

## Outcome and Follow-Up

- Outcome: requested selector/template feature completed.
- No live locale registry or generated catalog data was modified.
- Follow-up: add new rows to `language-locales.json` when additional Add Locale
  choices are required.

## Metrics

- Automated tests: 84 passed, 0 failed.
- Language validation: 0 errors, 1 warning.
- Implementation, test, and documentation files changed: 9.
