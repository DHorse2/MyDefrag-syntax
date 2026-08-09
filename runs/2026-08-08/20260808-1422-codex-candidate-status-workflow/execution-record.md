# Execution Record - Candidate Status Workflow

## Run

- Execution ID: `20260808-1422-codex-candidate-status-workflow`
- Date: `2026-08-08`
- Agent: Codex, Debugger role
- Computer: `MDM-TJ9DTHV`
- Project ID: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- AI root: `D:\AI\.AI`

## Task

Retain single-token and path-like translation candidates, add permanent
candidate review states, and add rejection and status-filter controls to the
Language Maintenance All Candidates window.

## Inputs and Scope

- Candidate scanner: `extractStringCandidates()` in
  `build/scripts/build-language.js`.
- Language Maintenance application under `build/app`.
- Canonical migration inventory in `language/canonical/components.json`.
- Direct `Do now` authorization after the execution cut-off.
- Existing unrelated working-tree changes were preserved.

## Startup

- Reused the startup documents already loaded once for this run, including the
  machine launcher policy, Debugger role, validation guidance, and execution
  record procedure.
- Used the direct user request as the active task after the execution cut-off.

## Diagnosis

- The scanner discarded every single-token value matching its path and
  identifier character class, including valid words such as `Save`.
- Candidate state was recalculated as Potential Candidate or In Catalog on each
  report load; no authored source preserved review decisions.
- The generated report also truncated each non-catalog and catalog group at 200
  entries, which contradicted the All Candidates screen.
- The catalog Add Record status already resolves its schema enum to a dropdown;
  candidate workflow status required a separate control.

## Actions and Decisions

- Removed the single-token and path-like candidate rejection rule. The scanner
  still requires a letter and retains its captured `require(` exclusion.
- Removed the 200-entry report truncation.
- Added `migrationInventory.candidateStatuses`, keyed by repository-relative
  path and normalized candidate text so decisions survive line movement.
- Added validation for candidate status paths, text, uniqueness, and allowed
  Potential, Review, and Rejected states.
- Kept In Catalog computed from current catalog text rather than persisting it.
- Added service and IPC operations to update candidate status in the in-memory
  draft; Save persists it through the existing components transaction.
- Added the Candidate status dropdown, Reject shortcut, four-state filter,
  status badges, and colors to the All Candidates window.
- Updated the readable report to include candidate status and non-catalog
  terminology.
- Updated Language Maintenance and builder documentation.

## Diagnostics and Iteration

- Initial application tests exposed three assertions based on the old scanner
  and two-state UI; implementation behavior was correct and tests were updated.
- A second application run exposed one remaining obsolete static assertion.
- The first report-test run exposed the old `Line <n>:` formatting assertion
  after status was added to each readable report line.
- No launcher fallback or sandbox failure materially affected execution.

## Commands and Results

- JavaScript syntax checks for changed files: exit `0`.
- JSON parse check for canonical `components.json`: exit `0`.
- `git diff --check` for the changed scope: exit `0`; one existing line-ending
  conversion warning was reported for `components.json`.
- `npm run test:language-app`: final exit `0`, 53 passed and 0 failed.
- `npm run test:language-report`: final exit `0`.
- `npm run language:validate`: exit `0`, 0 errors and 1 existing warning.
- Markdown lint for both updated guides and this record: exit `0`, 0 issues.

## Files Changed

- `build/scripts/build-language.js`
- `build/scripts/test-language-report.js`
- `build/app/services/language-maintenance-service.js`
- `build/app/shared/contracts.js`
- `build/app/main/ipc-handlers.js`
- `build/app/preload/preload.js`
- `build/app/renderer/app.js`
- `build/app/renderer/styles.css`
- `build/app/tests/language-maintenance-service.test.js`
- `build/app/tests/ui-security.test.js`
- `language/canonical/components.json`
- `docs/language-maintenance-app.md`
- `docs/build-language.md`
- This execution record.

## Validation

- Single-word candidate `Save` retained: pass.
- Path-like candidates retained: pass.
- Adjacent quoted fields still parsed without bridging: pass.
- Review and Rejected states survive Save and service reload: pass.
- Returning a candidate to Potential removes its explicit override: pass.
- Invalid candidate statuses rejected by validation: pass.
- In Catalog remains computed and cannot be assigned as an override: pass.
- A file containing 205 candidates reports all 205: pass.
- All four requested status filters and Reject action are wired through the
  sandboxed preload boundary: pass.
- Catalog Add Record status remains a schema-backed dropdown: pass.

## Outcome and Metrics

- Outcome: requested candidate workflow completed.
- Automated application tests: 53 passed, 0 failed.
- Report tests: passed.
- Language validation: passed with one existing `fr-CA` metadata warning.
- Production and documentation files changed: 10.
- Test files changed: 3.
