# Execution Record - Candidate Transform Preview Hooks

## Run

- Execution ID: `20260810-candidate-transform-preview-hooks`
- Date: `2026-08-10`
- Agent: Codex, Architect role
- Project ID: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- Shared startup root: `D:\AI\.AI`
- Active project AI root: `D:\Script\MyDefrag-syntax\.AI`

## Task

Extend the Applications Language app View Candidates window with an original
source-line display and a two-line transformed preview. Use the loaded component
catalog lookup, stage safe hooks for eventual IDE source replacement, and warn
without enforcement when an analyst accepts a string but moves on before the
source is updated.

## Inputs and Scope

- Existing migration candidate extractor, report classification, source-opening
  validation, component catalog loader, key suggestion, renderer, and tests.
- Existing uncommitted candidate line-order work from the immediately preceding
  task, preserved and extended in the same renderer, style, and UI test files.
- Existing dirty worktree, preserved without unrelated cleanup or edits.
- Source replacement remains disabled and non-writing in this phase.
- No catalog generation, locale generation, packaging, publishing, or repository
  file deletion.

## Startup and Loaded Guidance

- Reused the already loaded machine launcher policy and startup chain as required
  by the one-load-per-run rule.
- Continued using the project-local `.AI` instructions, Architect role,
  Validation procedure, Execution Record procedure and standard, and Markdown
  standard loaded earlier in this run.
- Consulted the focused Language Maintenance candidate-window memory to preserve
  the existing isolated renderer and narrow IPC boundaries.
- Read the current multilingual architecture, runtime catalog loader,
  language-runtime test, Language Maintenance documentation, candidate builder,
  source service, IPC, preload, renderer, styles, and focused tests.

## Actions

- Confirmed the established fast runtime form is a loaded component catalog plus
  `catalog.format(key, args).text` in-memory lookup.
- Extended `extractStringCandidates` with opt-in transformation metadata while
  leaving its default report output unchanged.
- Added exact absolute and line-relative literal offsets, delimiter, raw value,
  literal kind, and normalized candidate text for transformation consumers.
- Added a focused transform service that renders the original line and two
  transformed lines: a `tMessage` catalog lookup followed by the source line
  with the accepted literal replaced by `tMessage`.
- Passed named catalog placeholders as object shorthand arguments to
  `catalog.format`.
- Explicitly rejected ambiguous duplicate literals, multiline literals, and
  template expressions requiring parser-derived bindings.
- Added narrow preview, source-update-status, and replacement IPC/preload/service
  contracts.
- Kept the replacement control disabled; the replacement service validates and
  returns `SOURCE_REPLACEMENT_NOT_ENABLED` without writing.
- Added Original and Transformed code blocks plus replacement status to both
  non-catalog and cataloged candidate detail panes.
- Changed successful catalog acceptance to keep the candidate selected and mark
  its source update as pending.
- Added in-window advisory warnings before row, Previous, or Next navigation when
  the scanner still finds the accepted text in the current file. Navigation
  always continues.
- Added a close-time advisory summary for accepted candidates whose source update
  is still unverified.
- Documented the preview, parser metadata boundary, loaded catalog lookup,
  advisory workflow, and disabled replacement hook.

## Commands and Results

- Scoped `rg`, `Get-Content`, and `Select-String` inspections located the current
  scanner, loader, runtime example, source opener, IPC contracts, renderer, and
  tests. No existing parser-backed source-rewrite package or prior `tMessage`
  implementation was found.
- JavaScript syntax checks for all changed runtime surfaces: passed.
- Focused transform tests: passed 3 of 3.
- Focused Language Maintenance service tests: passed 31 of 31.
- Focused UI/security tests: passed 12 of 12.
- `npm run test:language-app`: passed 71 of 71.
- `npm run test:language-report`: passed.
- `npm run language:validate`: passed with zero errors and the established one
  `fr-CA` metadata-only fallback warning.
- Markdownlint for `docs\language-maintenance-app.md`: passed with zero issues.
- Markdownlint for this execution record: passed with zero issues.
- Scoped `git diff --check`: passed with only expected LF-to-CRLF notices.
- New-file trailing-whitespace check: passed.
- Scoped tracked-file deletion audit: no deletions.
- Generated language-output status check: no changes.

## Files Changed

- `build\scripts\build-language.js`
- `build\mdl-language-app\services\migration-source-transform.js`
- `build\mdl-language-app\services\language-maintenance-service.js`
- `build\mdl-language-app\shared\contracts.js`
- `build\mdl-language-app\main\ipc-handlers.js`
- `build\mdl-language-app\preload\preload.js`
- `build\mdl-language-app\renderer\app.js`
- `build\mdl-language-app\renderer\styles.css`
- `build\mdl-language-app\tests\migration-source-transform.test.js`
- `build\mdl-language-app\tests\language-maintenance-service.test.js`
- `build\mdl-language-app\tests\ui-security.test.js`
- `docs\language-maintenance-app.md`
- `runs\2026-08-10\20260810-candidate-transform-preview-hooks\execution-record.md`

## Decisions

- Used the existing `catalog.format` loader contract instead of introducing a
  second localization runtime.
- Made scanner location metadata opt-in so migration reports and their generated
  schema remain unchanged until a transformation consumer requests locations.
- Used `tMessage` as the initial preview variable and conservatively detect an
  existing identifier anywhere in the file.
- Kept real source writes disabled because template-expression binding, lexical
  scope, collision-free naming, stale-source comparison, atomic writes, and IDE
  refresh behavior are not complete.
- Kept source-update warnings advisory: no confirmation dialog, navigation
  block, forced source edit, or automatic write.
- Scanned the current whole file for the accepted candidate text so merely
  shifting the original literal to another line cannot falsely count as an
  update.
- Existing cataloged rows are not marked pending; the warning workflow begins
  only when the analyst accepts a new candidate in the current window session.
- Did not change authored or generated catalogs, source migration files, or
  unrelated dirty files.

## Diagnostics and Fallbacks

- An initial exact search found no existing `tMessage` or source-transform
  implementation. The current runtime documentation and test established the
  `createLanguageCatalog` and `catalog.format` convention.
- One combined patch failed because a documentation context did not match. No
  partial patch was applied; the changes were reapplied as smaller exact patches.
- One focused test initially used incorrect absolute-offset expectations. The
  observed exact offsets were reviewed and the test data was corrected.
- One static UI assertion initially matched the wrong object property. The
  assertion was narrowed to the implemented message and workflow transition.
- Repository-wide `git diff --check` reported pre-existing trailing whitespace
  in `.user\logs\parser.log`. A scoped check of all task-owned tracked files
  passed; unrelated logs were not edited.
- Live Electron interaction was not launched. Renderer, preload, and main-process
  changes require a full application restart for runtime confirmation.

## Validation

- Default scanner result shape unchanged: pass.
- Opt-in literal kind, delimiter, raw value, and offsets: pass.
- Original source line preview: pass.
- Two-line `catalog.format` plus `tMessage` preview: pass.
- Named placeholder argument emission: pass.
- Ambiguous same-line literal rejection: pass.
- Existing `tMessage` detection: pass.
- Template-expression parser requirement: pass.
- Preview request source revalidation: pass.
- Replacement hook performs no workspace source write: pass.
- Accepted candidate remains selected: pass by renderer transition and static
  regression coverage.
- Pending source is re-scanned before row and directional navigation: pass by
  narrow service contract and renderer regression coverage.
- Warning is non-blocking: pass by renderer control flow and documentation.
- Full Language Maintenance suite: pass, 71 of 71.
- Language report and validation: pass.
- Documentation Markdown: pass.
- Execution-record Markdown: pass.
- Repository files deleted: none.

## Artifacts

- Transform hook: `build\mdl-language-app\services\migration-source-transform.js`.
- Renderer workflow and preview: `build\mdl-language-app\renderer\app.js`.
- Focused transform tests:
  `build\mdl-language-app\tests\migration-source-transform.test.js`.
- Updated application documentation: `docs\language-maintenance-app.md`.
- This execution record.

## Outcome and Follow-Up

- Outcome: complete for the requested preview and initial hook phase. Analysts
  can inspect original and transformed forms, accepted candidates stay selected
  for source work, and moving on without updating source produces an advisory
  warning without enforcement.
- Follow-up before enabling Replace line: add a JavaScript parser capable of
  template-expression bindings and lexical scope, generate collision-free names,
  compare the exact expected source before an atomic write, and validate IDE
  refresh and undo behavior.
- Restart the Electron Language Maintenance app to activate renderer, preload,
  and main-process changes.

## Metrics

- Current-task implementation and test files changed or added: 11.
- Documentation files changed: 1.
- Execution records added: 1.
- Files deleted: 0.
- Full Language Maintenance tests: 71 passed, 0 failed.
- Focused transform tests: 3 passed, 0 failed.
- Focused service tests: 31 passed, 0 failed.
- Focused UI/security tests: 12 passed, 0 failed.
- Language validation: 0 errors, 1 established warning.
- Markdown issues: 0.
- Source writes performed by the replacement hook: 0.
- Elapsed time: Unavailable.

## Source Replacement Enablement Follow-up

- Confirmed the reported behavior was intentional in the original preview
  phase: the renderer always disabled Replace line and the service always
  returned `SOURCE_REPLACEMENT_NOT_ENABLED` without writing.
- Enabled replacement for exact single-line candidates in CommonJS `.js` and
  `.cjs` files after the selected catalog key exists in the current draft.
- Added collision-free variable selection (`tMessage`, `tMessage2`, and so on),
  transformed-source syntax validation, SHA-256 preview versions, stale-preview
  rejection, exact source-line comparison, and line-ending preservation.
- Reused the repository transaction to stage a temporary file, compare the
  expected source again immediately before activation, atomically rename the
  replacement, and retain a recovery path if backup cleanup fails.
- Kept JSON and other formats disabled because inserting the JavaScript
  `catalog.format(...)` preview would corrupt those files. The live package.json
  pane now states that a format-specific localization transform is required.
- Updated the renderer to pass the preview version, report successful writes,
  expose failures beside the button, and require a refreshed preview after a
  stale-source result.
- Added tests for CRLF-preserving application, changed-line rejection,
  collision-free naming, atomic stale-content rejection, successful source
  replacement, external-edit rejection, unsupported JSON, and renderer version
  forwarding.
- `npm run test:language-app` passed 74 of 74 tests. JavaScript syntax checks,
  focused transform/repository/service/UI tests, and scoped diff checks passed.
- The standard Windows control connection was unavailable. A read-only Electron
  inspection through the local debugging endpoint confirmed a cataloged
  `src/extension.js` candidate enables Replace with the expected two-line
  transform, while package.json remains disabled with the safety explanation.
- Did not click Replace against the real repository. Real source-writing tests
  used temporary fixtures only; no project source, catalog, or migration data
  was changed by validation and no file was deleted.
