# Detailed Project Review - MyDefrag Syntax Extension

Date: 2026-07-04
Repository: `D:\Script\MyDefrag-syntax`
Review type: read-only engineering review

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Scope Reviewed](#2-scope-reviewed)
- [3. Review Method](#3-review-method)
- [4. Required Context Issues](#4-required-context-issues)
- [5. Repository State](#5-repository-state)
- [6. Release-Blocking Findings](#6-release-blocking-findings)
  - [R1. `npm pack --dry-run` invokes a destructive deployment flow](#r1-npm-pack---dry-run-invokes-a-destructive-deployment-flow)
  - [R2. VSIX packaging fails because the entrypoint is ignored](#r2-vsix-packaging-fails-because-the-entrypoint-is-ignored)
  - [R3. View icon path is missing or inconsistent](#r3-view-icon-path-is-missing-or-inconsistent)
- [7. Runtime Correctness Findings](#7-runtime-correctness-findings)
  - [C1. Document link provider contains multiple hard failures](#c1-document-link-provider-contains-multiple-hard-failures)
  - [C2. Preview generation crashes on valid include traversal](#c2-preview-generation-crashes-on-valid-include-traversal)
  - [C3. Preprocess script creates LSP infrastructure unnecessarily](#c3-preprocess-script-creates-lsp-infrastructure-unnecessarily)
  - [C4. Production debugger statements remain in server startup](#c4-production-debugger-statements-remain-in-server-startup)
  - [C5. Server validation catch path can crash after an exception](#c5-server-validation-catch-path-can-crash-after-an-exception)
- [8. Parser and Language Model Findings](#8-parser-and-language-model-findings)
  - [P1. `languageData.js` keyword maps lose valid context](#p1-languagedatajs-keyword-maps-lose-valid-context)
  - [P2. Predefined identifiers are case-sensitive despite lower-cased tokenizer lookup](#p2-predefined-identifiers-are-case-sensitive-despite-lower-cased-tokenizer-lookup)
  - [P3. `kwParentExists()` does not return a value](#p3-kwparentexists-does-not-return-a-value)
  - [P4. Parser supports settings metadata that parseSetting does not handle](#p4-parser-supports-settings-metadata-that-parsesetting-does-not-handle)
  - [P5. Empty fragment parse can reference an undefined variable](#p5-empty-fragment-parse-can-reference-an-undefined-variable)
  - [P6. Fragment classifier has likely parent/action mismatches](#p6-fragment-classifier-has-likely-parentaction-mismatches)
  - [P7. Parser contains production console logging](#p7-parser-contains-production-console-logging)
- [9. Tokenizer Findings](#9-tokenizer-findings)
  - [T1. Tokenizer behavior and comments disagree for comments](#t1-tokenizer-behavior-and-comments-disagree-for-comments)
  - [T2. Tokenizer error path contains undeclared variables and invalid `this`](#t2-tokenizer-error-path-contains-undeclared-variables-and-invalid-this)
  - [T3. Unknown characters are silently skipped](#t3-unknown-characters-are-silently-skipped)
- [10. Diagnostic Workflow Findings](#10-diagnostic-workflow-findings)
  - [D1. `valid syntax` currently hides the diagnostic](#d1-valid-syntax-currently-hides-the-diagnostic)
  - [D2. `sendIt()` returns a different diagnostic after state mutation](#d2-sendit-returns-a-different-diagnostic-after-state-mutation)
  - [D3. Skip semantics are not aligned across docs and implementation](#d3-skip-semantics-are-not-aligned-across-docs-and-implementation)
  - [D4. Diagnostic view color uses a likely invalid theme color ID](#d4-diagnostic-view-color-uses-a-likely-invalid-theme-color-id)
- [11. Extension Client Findings](#11-extension-client-findings)
  - [E1. `src/extension.js` is too large and mixes unrelated responsibilities](#e1-srcextensionjs-is-too-large-and-mixes-unrelated-responsibilities)
  - [E2. Debug logging defaults are too noisy for production](#e2-debug-logging-defaults-are-too-noisy-for-production)
- [12. LSP Server and Performance Findings](#12-lsp-server-and-performance-findings)
  - [L1. Workspace scanning is synchronous and broad](#l1-workspace-scanning-is-synchronous-and-broad)
  - [L2. Diagnostic snapshot writes are synchronous on validation path](#l2-diagnostic-snapshot-writes-are-synchronous-on-validation-path)
  - [L3. Logger warning call signature is misused](#l3-logger-warning-call-signature-is-misused)
- [13. Shared Utility Findings](#13-shared-utility-findings)
  - [U1. INI parser contains legacy bugs and unclear ownership](#u1-ini-parser-contains-legacy-bugs-and-unclear-ownership)
  - [U2. Exclusion matching is not real glob matching](#u2-exclusion-matching-is-not-real-glob-matching)
- [14. Grammar, Snippet, and Syntax Highlighting Findings](#14-grammar-snippet-and-syntax-highlighting-findings)
  - [G1. TextMate grammar is out of sync with parser/language data](#g1-textmate-grammar-is-out-of-sync-with-parserlanguage-data)
  - [G2. Snippets need grammar verification](#g2-snippets-need-grammar-verification)
- [15. Documentation Findings](#15-documentation-findings)
  - [DOC1. Primary docs are mostly stubs](#doc1-primary-docs-are-mostly-stubs)
  - [DOC2. Some docs describe idealized or stale behavior](#doc2-some-docs-describe-idealized-or-stale-behavior)
  - [DOC3. Markdown conventions are inconsistent](#doc3-markdown-conventions-are-inconsistent)
- [16. Security and Safety Findings](#16-security-and-safety-findings)
  - [S1. Build scripts mutate user profile/editor state](#s1-build-scripts-mutate-user-profileeditor-state)
  - [S2. Scheduled task script supports plaintext password flow](#s2-scheduled-task-script-supports-plaintext-password-flow)
  - [S3. Registry-modifying script should be isolated](#s3-registry-modifying-script-should-be-isolated)
- [17. Testing Gaps](#17-testing-gaps)
- [18. Prioritized Repair Plan](#18-prioritized-repair-plan)
  - [Phase 1 - Make build/package safe](#phase-1---make-buildpackage-safe)
  - [Phase 2 - Restore core runtime workflows](#phase-2---restore-core-runtime-workflows)
  - [Phase 3 - Align grammar and parser](#phase-3---align-grammar-and-parser)
  - [Phase 4 - Documentation and maintainability](#phase-4---documentation-and-maintainability)
- [19. Revisions Log](#19-revisions-log)
  - [Files Created](#files-created)
  - [Files Updated](#files-updated)
  - [Files Deleted](#files-deleted)
  - [Files Recommended for Future Creation](#files-recommended-for-future-creation)
  - [Files Recommended for Future Update](#files-recommended-for-future-update)
  - [Verification Results](#verification-results)
  - [Review Caveats](#review-caveats)

## 1. Executive Summary

The extension has the right high-level shape for a MyDefrag language extension: a VS Code/VSCodium client, an LSP server, tokenizer, recursive descent parser, diagnostic snapshot workflow, snippets, grammar, and preview tooling. The strongest parts are the dedicated parser module, the diagnostic navigation model, and the use of local MyDefrag language data instead of scattering every keyword through the codebase.

The project is not currently release-ready. There are release-blocking packaging problems, several runtime defects in document link handling and preview generation, parser/data mismatches, production debugger statements, and documentation that no longer matches the implementation. The build/deploy scripts are also too destructive for normal package lifecycle hooks: `npm pack --dry-run` attempted to uninstall the local VSCodium extension, modify the extension registry, restart the extension host, and then failed.

The safest next step is not a broad rewrite. Stabilize packaging and startup first, then fix the narrow runtime failures that prevent core workflows from behaving predictably. After that, align parser, language data, snippets, TextMate grammar, and docs around one source of truth.

## 2. Scope Reviewed

Reviewed maintained project surface:

- `D:\AI\.AI` session and review instructions.
- `package.json`, `.vscodeignore`, `readme.md`.
- `src/extension.js`.
- `src/server/server.js`, `src/server/parser.js`, `src/server/tokenizer.js`, `src/server/languageData.js`.
- `src/diagnostics/*`.
- `src/shared/*`.
- `src/utilities/*`.
- `src/preprocess/mydefrag-preprocess.js`.
- `syntaxes/mydfrg.tmLanguage.json`.
- `snippets/mydfrg.code-snippets`.
- `scripts/*.ps1`, `scripts/review-help-conversion.js`, and auxiliary script inventory.
- Primary docs under `docs/`.

Excluded as generated, vendored, or reference bulk except where relevant:

- `node_modules`.
- `.git`.
- `.user/logs` runtime data.
- packaged `.vsix` artifacts.
- converted MyDefrag help bulk, except where it affects grammar/source-of-truth concerns.

## 3. Review Method

The required `D:\AI\.AI\SESSION_TEMPLATE.md` load sequence was followed before project work. Required context documents were read before reviewing implementation. Missing required context files are listed below.

Read-only verification performed:

- `node --check src\extension.js`
- `node --check src\server\server.js`
- `node --check src\server\parser.js`
- `node --check src\preprocess\mydefrag-preprocess.js`
- `npm pack --dry-run --json`

The Node syntax checks passed. The npm packaging check failed and had destructive side effects through the `prepare` lifecycle hook.

## 4. Required Context Issues

Resolved on 2026-07-04: the required AI load order now points at existing shared AI context files.

- `D:\AI\.AI\context\DEBUGGING_WORKFLOW.md` exists.
- `D:\AI\.AI\README.md` exists and is human-facing, not required AI context.

The original process defect is closed for these two files. Future automation should still fail closed if any required AI context file is missing.

## 5. Repository State

The working tree was already very dirty at review time. There are many modified, deleted, and untracked files across `D:\AI\.AI`, `.user`, docs, scripts, package metadata, source, artifacts, and runtime logs. This review did not attempt to revert or normalize those changes.

There are suspicious root-level files that appear to be accidental command fragments and have already leaked into installed extension paths:

- `!defs.includes(c)))]`
- `console.log((i+681)+'`
- `e.message).join(`
- `e.message)])})()`
- `{const{Parser`
- `dir.data`
- `tree.data`

These are workspace hygiene and packaging risks. They should be removed only after confirming they are not intentionally tracked or needed.

## 6. Release-Blocking Findings

### R1. `npm pack --dry-run` invokes a destructive deployment flow

Severity: Critical

Evidence:

- `package.json` defines `prepare` as `npm run build`.
- `build` runs `powershell -ExecutionPolicy Bypass -File ./scripts/build-and-deploy.ps1 -SkipInstall`.
- `scripts/build-and-deploy.ps1` has no parameter block honoring `-SkipInstall`.
- The packaging check attempted to delete `C:\Users\david\.vscode-oss\extensions\macrodm.mydefrag-syntax-0.4.0`, edit `extensions.json`, restart the extension host, and package VSIX.

Impact:

- Standard npm lifecycle commands can mutate the user's installed editor state.
- CI, publishing, and dry-run packaging are unsafe.
- The build cannot be trusted as a pure build step.

Recommended fix:

- Split build, package, install, and restart into separate scripts.
- Remove deploy/install work from `prepare`.
- Add a real `param(...)` block to `build-and-deploy.ps1` or stop passing ignored switches.
- Make `npm run build` read-only with respect to user profile/editor state.

### R2. VSIX packaging fails because the entrypoint is ignored

Severity: Critical

Evidence:

- `.vscodeignore` contains `src/**`.
- `package.json` main entrypoint is `./src/extension.js`.
- VSCE error: `Extension entrypoint(s) missing... extension/src/extension.js`.

Impact:

- The extension cannot be packaged correctly from the current ignore rules.
- Existing VSIX artifacts may not represent the current source.

Recommended fix:

- Do not exclude `src/**` unless a compiled `dist` entrypoint exists and `package.json.main` points to it.
- If the intended artifact is source-based, include `src`, `syntaxes`, `snippets`, `resources`, `package.json`, `readme.md`, and required runtime files.

### R3. View icon path is missing or inconsistent

Severity: High

Evidence:

- `package.json` contributes the diagnostic explorer icon as `resources/icons/logo.svg`.
- Current inventory shows `resources/logo.png` and `resources/logo.gif`, not `resources/icons/logo.svg`.

Impact:

- Diagnostic explorer view icon may be broken in packaged installs.

Recommended fix:

- Either add `resources/icons/logo.svg` or update `package.json` to point at an existing resource.

## 7. Runtime Correctness Findings

### C1. Document link provider contains multiple hard failures

Severity: High

File: `src/extension.js`

Issues observed:

- `absolutePath(document, filePath)` uses `path.resolve(document.fileName, filePath)`, treating a file path as a directory.
- Link ranges use `match.index` as a character offset within a single line, which is wrong for multi-line document offsets.
- Duplicate detection compares `link.range.start.character` to a `Position` object.
- `target(targetUri, start.line, start)` passes a `Uri` and `Position` where path/line/column values are expected.
- Batch link code shadows the `absolutePath` function and then passes the function object into `vscode.Uri.file()` and `path.dirname()`.
- `findFileWalkingUp(currentDir, filePath)` passes a function instead of the current directory string.
- `new vscode.Diagnostic({ severity: thisseverity, range, message, source })` uses an invalid constructor pattern and an undefined `thisseverity`.
- `batLinkProvider` and `openCmd` are added to subscriptions but appear undefined.
- The provider collects several link categories but returns only `batchFileCommandLinks`.

Impact:

- Include/file/batch command navigation is likely broken.
- The link provider can throw at runtime.
- Diagnostics created inside this area may never work as intended.

Recommended fix:

- Extract document link logic into a small tested module.
- Convert regex offsets to `document.positionAt(offset)`.
- Use `path.dirname(document.fileName)` when resolving relative paths.
- Return all link categories from a single normalized array.
- Add a fixture-based test for `Include("...")`, command files, and relative traversal.

### C2. Preview generation crashes on valid include traversal

Severity: High

File: `src/preprocess/mydefrag-preprocess.js`

Evidence:

- `linkVisited` is initialized as `[]`.
- `processFile()` calls `linkVisited.add(filePath)`.
- Arrays do not implement `.add()`.

Impact:

- Preview generation can fail immediately when processing files.

Recommended fix:

- Use `new Set()` for visited files.
- Normalize paths with `path.resolve()` and case-fold on Windows before cycle checks.

### C3. Preprocess script creates LSP infrastructure unnecessarily

Severity: Medium

File: `src/preprocess/mydefrag-preprocess.js`

Evidence:

- Imports `vscode-languageserver/node`.
- Creates `createConnection(ProposedFeatures.all)` in a CLI-style preprocess script.

Impact:

- Extra IPC/stdout behavior can interfere with a subprocess used for preview output.
- It increases coupling between preview and language-server runtime.

Recommended fix:

- Remove LSP connection creation from the preprocess script.
- Keep preview as a pure CLI/library function.

### C4. Production debugger statements remain in server startup

Severity: High

File: `src/server/server.js`

Evidence:

- Top-level `debugger;`.
- Additional `debugger;` in initialize flow.
- Top-level `console?.error('SERVER: entered server.js')`.

Impact:

- Extension host debugging can unexpectedly pause.
- Server startup emits noise before logger/config initialization.

Recommended fix:

- Remove debugger statements and direct startup console writes.
- Use the configured logger after initialization.

### C5. Server validation catch path can crash after an exception

Severity: High

File: `src/server/server.js`

Evidence:

- `validateDocument()` can catch a tokenizer/parser exception, but later code still reads `bestParser.errors`.
- If the exception occurs before `bestParser` is assigned, validation can fail again instead of sending a useful diagnostic.

Impact:

- A malformed document or internal parser error can take down validation for the document/workspace.

Recommended fix:

- Initialize `bestParser` to a safe empty result or return immediately after emitting an internal-error diagnostic.
- Add tests for tokenizer/parser exceptions.

## 8. Parser and Language Model Findings

### P1. `languageData.js` keyword maps lose valid context

Severity: High

File: `src/server/languageData.js`

Evidence:

- `KEYWORDS_MAP = new Map(KEYWORDS.map(k => [k.text, k]))`.
- Duplicate keyword text exists with different parents, such as `fixed` and `all`.
- Last write wins, so only one parent survives in the direct map.

Impact:

- Token metadata can be wrong when the same text is valid in multiple grammar contexts.
- Fragment diagnostics and keyword hints can become misleading.

Recommended fix:

- Store keyword entries by lower-case text as arrays.
- Resolve parent/context at parser time rather than by single global winner.

### P2. Predefined identifiers are case-sensitive despite lower-cased tokenizer lookup

Severity: High

File: `src/server/languageData.js`

Evidence:

- Many predefined identifiers use mixed case, for example `ZoneNumber`.
- `isPredefinedIdentifier(variable)` compares exact text.
- The tokenizer lowercases identifiers before keyword/predefined checks.

Impact:

- Known predefined variables may be tokenized as ordinary identifiers.
- Parser diagnostics can reject or misclassify valid MyDefrag variables.

Recommended fix:

- Normalize language data maps to lower-case keys while preserving display text.

### P3. `kwParentExists()` does not return a value

Severity: Medium

File: `src/server/languageData.js`

Evidence:

- `function kwParentExists(parent) { KEYWORDS_BY_PARENT.has(parent); }`

Impact:

- Any caller expecting a boolean always receives `undefined`.

Recommended fix:

- Return the `has()` result.

### P4. Parser supports settings metadata that parseSetting does not handle

Severity: High

Files:

- `src/server/languageData.js`
- `src/server/parser.js`

Evidence:

- Settings metadata includes `setvariabledefault` and `setvariableifempty`.
- `parseSetting()` does not implement cases for those names.

Impact:

- A setting can appear in completions or metadata but be rejected as unknown by the parser.

Recommended fix:

- Either implement both grammar forms in `parseSetting()` or remove them from active metadata until implemented.

### P5. Empty fragment parse can reference an undefined variable

Severity: Medium

File: `src/server/parser.js`

Evidence:

- `parseFragment()` advances `fragmentInfo.step++` after the token loop.
- If the loop never runs, `fragmentInfo` may be undefined.

Impact:

- Empty or whitespace-only fragments can throw instead of producing no diagnostics.

Recommended fix:

- Initialize fragment trace state before the loop or guard post-loop trace updates.

### P6. Fragment classifier has likely parent/action mismatches

Severity: Medium

File: `src/server/parser.js`

Examples:

- `backwardFileSelectAction()` returns parent `fileactions` while also allowing `fileselect`.
- `filelocation` is routed through `backwardFileSortAction()` even though the full parser treats it as a file boolean.

Impact:

- Diagnostics and AI prompts can send the user to the wrong grammar context.

Recommended fix:

- Add fixture tests for each MyDefrag keyword parent and compare fragment classification to full-parse behavior.

### P7. Parser contains production console logging

Severity: Low

File: `src/server/parser.js`

Evidence:

- `parseFileBooleans()` writes to `console.log()`.

Impact:

- Noisy output and hard-to-control logs in extension host/LSP runtime.

Recommended fix:

- Remove console logs or route through trace logger gated by configuration.

## 9. Tokenizer Findings

### T1. Tokenizer behavior and comments disagree for comments

Severity: Medium

File: `src/server/tokenizer.js`

Evidence:

- Code treats `--` and `REM` as comments.
- Comment text says `--` and `REM` are not comments.

Impact:

- Maintainers cannot tell whether this is intended compatibility or a parser bug.

Recommended fix:

- Verify against MyDefrag help/BNF and update either tokenizer behavior or comments.

### T2. Tokenizer error path contains undeclared variables and invalid `this`

Severity: Medium

File: `src/server/tokenizer.js`

Evidence:

- Catch path assigns `message = ...` without declaration.
- Catch path calls `this.warningAtStart` inside a free function.

Impact:

- Tokenizer exceptions can become secondary exceptions.

Recommended fix:

- Use local `const message`.
- Call the local diagnostic helper directly.

### T3. Unknown characters are silently skipped

Severity: Medium

File: `src/server/tokenizer.js`

Impact:

- Invalid syntax can disappear before parsing, causing confusing downstream errors.

Recommended fix:

- Emit `UNKNOWN` tokens or tokenizer diagnostics with exact ranges.

## 10. Diagnostic Workflow Findings

### D1. `valid syntax` currently hides the diagnostic

Severity: High

Files:

- `src/diagnostics/diagnosticNavigator.js`
- `docs/Developer Guide - Diagnostic Explorer.md`
- `D:\AI\.AI\prompts\Debug Extension Using Diagnostics.md`

Evidence:

- `validSyntax()` sets state to `IGNORED`.
- The diagnostic workflow says `valid syntax` means the script is valid and the parser/classifier should be investigated, not that the issue should be dismissed.

Impact:

- Valid parser bugs can be removed from the active queue.
- The diagnostic workflow loses exactly the cases it is meant to preserve for repair.

Recommended fix:

- Add a separate state such as `VALID_SYNTAX_REPORTED` or `PARSER_BUG`.
- Keep it visible in a parser-bug queue, or write a dedicated report item.

### D2. `sendIt()` returns a different diagnostic after state mutation

Severity: Medium

File: `src/diagnostics/diagnosticNavigator.js`

Evidence:

- `sendIt()` marks the current item as sent, writes prompt files, reloads diagnostics, and returns `this.current()`.
- Since sent items are filtered, `this.current()` can point to the next issue.

Impact:

- Callers can display or act on the wrong item after sending.

Recommended fix:

- Capture the sent diagnostic before mutation and return that captured object.

### D3. Skip semantics are not aligned across docs and implementation

Severity: Medium

File: `src/diagnostics/diagnosticNavigator.js`

Evidence:

- `skipItem()` skips one diagnostic key.
- Some workflow language describes skipping the rest of the current file.

Impact:

- Agent/user expectations can diverge during diagnostic triage.

Recommended fix:

- Clarify command semantics in docs, or add a separate `skip file` command that marks all current-file diagnostics.

### D4. Diagnostic view color uses a likely invalid theme color ID

Severity: Low

File: `src/diagnostics/diagnosticTreeProvider.js`

Evidence:

- Uses `new vscode.ThemeColor('green')`.

Impact:

- Color may not resolve consistently across themes.

Recommended fix:

- Use documented theme color IDs or avoid fixed color IDs.

## 11. Extension Client Findings

### E1. `src/extension.js` is too large and mixes unrelated responsibilities

Severity: Medium

File: `src/extension.js`

Current responsibilities include:

- Activation/config normalization.
- Client/server startup.
- Output channels and status bar.
- Document link provider.
- Preview command.
- Diagnostic navigation registration.
- Settings commands.
- Logging and message handling.

Impact:

- Runtime bugs are harder to isolate.
- Testing individual behaviors is difficult.

Recommended fix:

- Split into `client/startLanguageClient.js`, `client/documentLinks.js`, `client/preview.js`, `client/config.js`, and diagnostic registration modules.

### E2. Debug logging defaults are too noisy for production

Severity: Medium

Evidence:

- `mydfrg.debugOn` default is `true`.
- `mydfrg.verboseLevel` default is `5`.

Impact:

- Normal installs produce verbose logs and larger `.user/logs` churn.

Recommended fix:

- Default debug off and verbose level low.
- Keep high verbosity available through workspace settings.

## 12. LSP Server and Performance Findings

### L1. Workspace scanning is synchronous and broad

Severity: Medium

File: `src/server/server.js`

Evidence:

- Workspace scan walks folders synchronously and validates each `.myd`/`.mydc`.
- Scan runs after initialization and on watched file/config changes.

Impact:

- Large workspaces can block server responsiveness.
- Diagnostic snapshots can churn heavily.

Recommended fix:

- Debounce scans.
- Prefer opened documents first.
- Consider async file walking and cancellation.

### L2. Diagnostic snapshot writes are synchronous on validation path

Severity: Medium

File: `src/server/server.js`

Impact:

- Frequent edits can cause repeated disk writes under `.user/logs`.

Recommended fix:

- Debounce snapshot writes and coalesce changes.

### L3. Logger warning call signature is misused

Severity: Low

Files:

- `src/server/server.js`
- `src/shared/logger.js`

Evidence:

- Some calls use `logger.warn(message)` while logger methods expect severity and message-like parameters.

Impact:

- Log output can be malformed or missing.

Recommended fix:

- Simplify logger API to `debug/info/warn/error(message, details?)`, or add overload handling.

## 13. Shared Utility Findings

### U1. INI parser contains legacy bugs and unclear ownership

Severity: Medium

File: `src/shared/ini.js`

Examples:

- `readIni()` initializes `result` as `new Set()` but uses it as an object.
- `isLogOn = ... ? useStrict : isLogOn` appears to assign the wrong value.
- Catch path assigns `message` without declaration.

Impact:

- Legacy config handling can produce unpredictable behavior.
- It increases maintenance cost now that VS Code settings are the primary config surface.

Recommended fix:

- Decide whether INI support is still required.
- If yes, add tests and fix the data model.
- If no, deprecate and remove it from active runtime paths.

### U2. Exclusion matching is not real glob matching

Severity: Medium

File: `src/utilities/util.js`

Evidence:

- `isExcluded()` strips `**/` and `*` and then uses substring matching.

Impact:

- Files can be incorrectly included or excluded.

Recommended fix:

- Use VS Code `RelativePattern`, `minimatch`, or a small tested glob matcher.

## 14. Grammar, Snippet, and Syntax Highlighting Findings

### G1. TextMate grammar is out of sync with parser/language data

Severity: High

File: `syntaxes/mydfrg.tmLanguage.json`

Examples:

- Grammar includes terms such as `Name`, `Path`, `Extension`, `SparseFile`, `ReparsePoint`, `NotIndexed`.
- Parser/language data use different names for several file booleans, such as `FileName`, `DirectoryPath`, `Sparse`, and `NotToBeIndexed`.

Impact:

- Highlighting can suggest syntax the parser rejects.
- Users may interpret highlight success as parser validity.

Recommended fix:

- Generate grammar keyword lists from canonical language data, or add a comparison test that fails on drift.

### G2. Snippets need grammar verification

Severity: Medium

File: `snippets/mydfrg.code-snippets`

Impact:

- Snippets are broad and useful, but they should be tested against parser fixtures to ensure every generated body is accepted.

Recommended fix:

- Add a snippet expansion validation script for representative choices.

## 15. Documentation Findings

### DOC1. Primary docs are mostly stubs

Severity: Medium

Files:

- `docs/ARCHITECTURE.md`
- `docs/COMMANDS.md`
- `docs/DEVELOPER.md`
- `docs/DIAGNOSTICS.md`
- `docs/FEATURES.md`
- `docs/INSTALL.md`
- `docs/LANGUAGE_REFERENCE.md`
- `docs/LANGUAGE_SERVER.md`
- `docs/PREVIEW.md`
- `docs/QUICKSTART.md`
- `docs/SETTINGS.md`
- `docs/SNIPPETS.md`

Impact:

- New contributors and future agents cannot rely on docs for current behavior.

Recommended fix:

- Prioritize `ARCHITECTURE`, `DEVELOPER`, `DIAGNOSTICS`, `LANGUAGE_REFERENCE`, and `INSTALL`.

### DOC2. Some docs describe idealized or stale behavior

Severity: Medium

Examples:

- `docs/MyDefrag Project Assessment.md` describes architecture/features that do not match the current source.
- `docs/Parser Debug Trace Information.md` uses trace names that do not match all current parser trace events.
- `docs/ExtensionStdFolderStruct.md` describes a target structure rather than current structure.

Impact:

- Documentation can mislead repair work.

Recommended fix:

- Label aspirational docs as proposals or update them against the current codebase.

### DOC3. Markdown conventions are inconsistent

Severity: Low

Evidence:

- `D:\AI\.AI` rules require dash bullets, but several `D:\AI\.AI` and docs files use `*`.
- Some `D:\AI\.AI` files contain malformed bold/list markers.

Impact:

- Documentation automation and readability suffer.

Recommended fix:

- Run markdown linting after deciding the desired style.

## 16. Security and Safety Findings

### S1. Build scripts mutate user profile/editor state

Severity: High

Files:

- `scripts/build-and-deploy.ps1`
- `scripts/update-live-MyDefrag.ps1`

Impact:

- Build commands can delete installed extensions, edit editor registries/settings, and restart the editor.

Recommended fix:

- Require explicit deploy commands for user-profile mutations.
- Keep build/package commands read-only outside the workspace.

### S2. Scheduled task script supports plaintext password flow

Severity: Medium

File: `scripts/enable-networkDrives.ps1`

Impact:

- Useful operational script, but sensitive and not part of extension runtime.

Recommended fix:

- Move to an admin/tools area with clear warnings and avoid storing passwords.

### S3. Registry-modifying script should be isolated

Severity: Medium

File: `scripts/add-VsCodium-ToExplorer.ps1`

Impact:

- Writes HKCR registry keys. This should not be confused with ordinary extension development.

Recommended fix:

- Move to optional tooling documentation and require explicit user confirmation.

## 17. Testing Gaps

Current repository state does not show a working automated test suite for the most important behaviors.

Highest-value tests to add:

- Parser fixture tests for valid MyDefrag examples from help/BNF.
- Parser fixture tests for invalid syntax and diagnostic ranges.
- Fragment parser tests for current-line diagnostics, parent hints, and empty fragments.
- Tokenizer tests for strings, comments, numbers, macros, predefined identifiers, and unknown characters.
- Language data drift tests for duplicate keywords and parser coverage.
- Document link provider tests for include/file/batch command links.
- Preview include traversal and cycle tests.
- Diagnostic navigator tests for `get next`, `skip`, `valid syntax`, `repair`, and `sendIt`.
- Package verification test that asserts the VSIX contains the extension entrypoint and required assets.

## 18. Prioritized Repair Plan

### Phase 1 - Make build/package safe

1. Remove deploy behavior from `prepare` and `build`.
2. Fix `.vscodeignore` so the packaged extension includes the entrypoint and assets.
3. Remove debugger statements from server startup.
4. Fix missing contributed icon path.
5. Delete or quarantine accidental root command-fragment files after confirmation.

### Phase 2 - Restore core runtime workflows

1. Fix document link provider path/range/return logic.
2. Fix preview `linkVisited` and path normalization.
3. Guard server validation exception paths.
4. Fix `valid syntax` state semantics.
5. Fix known language data return/case issues.

### Phase 3 - Align grammar and parser

1. Normalize language data into canonical lower-case maps.
2. Resolve duplicate keyword contexts with multi-entry lookup.
3. Implement or remove unsupported settings metadata.
4. Add parser fixture coverage before expanding grammar.
5. Generate or validate TextMate grammar and snippets from canonical data.

### Phase 4 - Documentation and maintainability

1. Update required `D:\AI\.AI` load-order files or remove missing references.
2. Replace stale docs with current architecture and workflow docs.
3. Split `src/extension.js` into focused modules.
4. Clarify which scripts are build scripts and which are local admin/deploy tools.

## 19. Revisions Log

### Files Created

- `.user/.ai-output/reviews/2026-07-04 Detailed Project Review.md`

### Files Updated

- None.

### Files Deleted

- None.

### Files Recommended for Future Creation

- `test/server/parser.test.js`
- `test/server/tokenizer.test.js`
- `test/server/fragment.test.js`
- `test/client/documentLinks.test.js`
- `test/preprocess/preview.test.js`
- `test/diagnostics/navigator.test.js`
- `test/package/vsixContents.test.js`
- `.github/workflows/ci.yml`

### Files Recommended for Future Update

- `package.json`
- `.vscodeignore`
- `scripts/build-and-deploy.ps1`
- `scripts/update-live-MyDefrag.ps1`
- `src/extension.js`
- `src/server/server.js`
- `src/server/parser.js`
- `src/server/tokenizer.js`
- `src/server/languageData.js`
- `src/preprocess/mydefrag-preprocess.js`
- `src/diagnostics/diagnosticNavigator.js`
- `src/shared/logger.js`
- `src/shared/ini.js`
- `src/utilities/util.js`
- `syntaxes/mydfrg.tmLanguage.json`
- `snippets/mydfrg.code-snippets`
- `D:\AI\.AI\START_HERE.md`
- `D:\AI\.AI\context\*`
- Primary docs under `docs/`

### Verification Results

- `node --check src\extension.js`: passed.
- `node --check src\server\server.js`: passed.
- `node --check src\server\parser.js`: passed.
- `node --check src\preprocess\mydefrag-preprocess.js`: passed.
- `npm pack --dry-run --json`: failed after invoking the destructive `prepare`/deploy path and then failing VSIX packaging because `src/**` is ignored.

### Review Caveats

- The worktree had many pre-existing modifications and deletions.
- This review did not change source files or attempt repairs.
- Some generated/reference docs were sampled for relevance rather than treated as maintained runtime code.
