# Code Review TODO Work Queue

Generated from `.user/.ai-output/reviews/2026-07-04 Detailed Project Review.md`.

## Table of Contents

- [CR-0001-01](#cr-0001-01)
- [CR-0001-02](#cr-0001-02)
- [CR-0002-01](#cr-0002-01)
- [CR-0002-02](#cr-0002-02)
- [CR-0004-01](#cr-0004-01)
- [CR-0005-01](#cr-0005-01)
- [CR-0008-01](#cr-0008-01)
- [CR-0009-01](#cr-0009-01)
- [CR-0010-01](#cr-0010-01)
- [CR-0012-01](#cr-0012-01)
- [CR-0012-02](#cr-0012-02)
- [CR-0001-03](#cr-0001-03)
- [CR-0003-01](#cr-0003-01)
- [CR-0007-01](#cr-0007-01)
- [CR-0019-03](#cr-0019-03)
- [CR-0019-02](#cr-0019-02)
- [CR-0019-01](#cr-0019-01)
- [CR-0030-01](#cr-0030-01)
- [CR-0037-02](#cr-0037-02)
- [CR-0037-01](#cr-0037-01)
- [CR-0013-01](#cr-0013-01)
- [CR-0017-01](#cr-0017-01)
- [CR-0006-01](#cr-0006-01)
- [CR-0011-01](#cr-0011-01)
- [CR-0014-01](#cr-0014-01)
- [CR-0016-01](#cr-0016-01)
- [CR-0018-01](#cr-0018-01)
- [CR-0020-01](#cr-0020-01)
- [CR-0024-01](#cr-0024-01)
- [CR-0025-01](#cr-0025-01)
- [CR-0026-01](#cr-0026-01)
- [CR-0028-01](#cr-0028-01)
- [CR-0029-01](#cr-0029-01)
- [CR-0033-03](#cr-0033-03)
- [CR-0033-01](#cr-0033-01)
- [CR-0033-02](#cr-0033-02)
- [CR-0035-01](#cr-0035-01)
- [CR-0036-01](#cr-0036-01)
- [CR-0038-02](#cr-0038-02)
- [CR-0038-01](#cr-0038-01)
- [CR-0021-01](#cr-0021-01)
- [CR-0023-01](#cr-0023-01)
- [CR-0031-01](#cr-0031-01)
- [CR-0032-01](#cr-0032-01)
- [CR-0032-02](#cr-0032-02)
- [CR-0032-03](#cr-0032-03)
- [CR-0032-04](#cr-0032-04)
- [CR-0032-05](#cr-0032-05)
- [CR-0032-06](#cr-0032-06)
- [CR-0032-07](#cr-0032-07)
- [CR-0032-08](#cr-0032-08)
- [CR-0032-09](#cr-0032-09)
- [CR-0032-10](#cr-0032-10)
- [CR-0032-11](#cr-0032-11)
- [CR-0032-12](#cr-0032-12)
- [CR-0037-04](#cr-0037-04)
- [CR-0037-06](#cr-0037-06)
- [CR-0037-07](#cr-0037-07)
- [CR-0037-05](#cr-0037-05)
- [CR-0037-03](#cr-0037-03)
- [CR-0027-01](#cr-0027-01)
- [CR-0027-02](#cr-0027-02)
- [CR-0015-01](#cr-0015-01)
- [CR-0022-01](#cr-0022-01)
- [CR-0034-01](#cr-0034-01)

## CR-0001-01

- ID: CR-0001-01
- Priority: critical
- Status: open
- Severity: error
- File: `package.json`
- Line/Column: 1/1
- Token: `prepare`
- Category: safety
- Action: Split pure build/package steps from deploy/install/restart steps and keep npm lifecycle commands read-only outside the workspace.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/package.json:1:1`

## CR-0001-02

- ID: CR-0001-02
- Priority: critical
- Status: open
- Severity: error
- File: `scripts/build-and-deploy.ps1`
- Line/Column: 1/1
- Token: `SkipInstall`
- Category: safety
- Action: Add a real parameter contract or remove ignored switches; move install/restart/user-profile mutation to explicit deploy commands.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/scripts/build-and-deploy.ps1:1:1`

## CR-0002-01

- ID: CR-0002-01
- Priority: critical
- Status: open
- Severity: error
- File: `.vscodeignore`
- Line/Column: 1/1
- Token: `src/**`
- Category: configuration
- Action: Include src in the package or switch package.json.main to a packaged dist entrypoint.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/.vscodeignore:1:1`

## CR-0002-02

- ID: CR-0002-02
- Priority: critical
- Status: open
- Severity: error
- File: `package.json`
- Line/Column: 1/1
- Token: `main`
- Category: configuration
- Action: Align package.json.main with packaged files and verify the VSIX contains the entrypoint.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/package.json:1:1`

## CR-0004-01

- ID: CR-0004-01
- Priority: high
- Status: open
- Severity: error
- File: `src/extension.js`
- Line/Column: 1/1
- Token: `DocumentLinkProvider`
- Category: extension-command
- Action: Extract and test document link logic; fix relative path resolution, offset conversion, diagnostics construction, subscriptions, and returned link categories.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/extension.js:1:1`

## CR-0005-01

- ID: CR-0005-01
- Priority: high
- Status: open
- Severity: error
- File: `src/preprocess/mydefrag-preprocess.js`
- Line/Column: 1/1
- Token: `linkVisited`
- Category: extension-command
- Action: Use a Set for visited files and normalize/case-fold resolved paths before cycle checks.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/preprocess/mydefrag-preprocess.js:1:1`

## CR-0008-01

- ID: CR-0008-01
- Priority: high
- Status: open
- Severity: error
- File: `src/server/server.js`
- Line/Column: 1/1
- Token: `bestParser`
- Category: safety
- Action: Initialize a safe parser/result object or return immediately after emitting an internal-error diagnostic.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/server/server.js:1:1`

## CR-0009-01

- ID: CR-0009-01
- Priority: high
- Status: open
- Severity: error
- File: `src/server/languageData.js`
- Line/Column: 1/1
- Token: `KEYWORDS_MAP`
- Category: parser-classification
- Action: Store keyword entries by lower-case text as arrays and resolve parent/context at parser time.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/server/languageData.js:1:1`

## CR-0010-01

- ID: CR-0010-01
- Priority: high
- Status: open
- Severity: error
- File: `src/server/languageData.js`
- Line/Column: 1/1
- Token: `ZoneNumber`
- Category: parser-classification
- Action: Normalize predefined identifier lookup keys to lower case while preserving display text.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/server/languageData.js:1:1`

## CR-0012-01

- ID: CR-0012-01
- Priority: high
- Status: open
- Severity: error
- File: `src/server/languageData.js`
- Line/Column: 1/1
- Token: `setvariabledefault`
- Category: parser-false-positive
- Action: Either remove unsupported active metadata or implement the corresponding grammar forms.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/server/languageData.js:1:1`

## CR-0012-02

- ID: CR-0012-02
- Priority: high
- Status: open
- Severity: error
- File: `src/server/parser.js`
- Line/Column: 1/1
- Token: `parseSetting`
- Category: parser-false-positive
- Action: Implement the supported grammar forms or coordinate removal from active metadata.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/server/parser.js:1:1`

## CR-0001-03

- ID: CR-0001-03
- Priority: high
- Status: closed
- Severity: information
- File: `scripts/update-live-MyDefrag.ps1`
- Line/Column: 1/1
- Token: `update-live-MyDefrag`
- Category: safety
- Action: Keep this as an explicit deploy/admin command with clear confirmation and documentation.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/scripts/update-live-MyDefrag.ps1:1:1`

## CR-0003-01

- ID: CR-0003-01
- Priority: high
- Status: open
- Severity: warning
- File: `package.json`
- Line/Column: 1/1
- Token: `resources/icons/logo.svg`
- Category: configuration
- Action: Add the referenced SVG icon or update the contributed view icon path to an existing resource.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/package.json:1:1`

## CR-0007-01

- ID: CR-0007-01
- Priority: high
- Status: open
- Severity: warning
- File: `src/server/server.js`
- Line/Column: 1/1
- Token: `debugger`
- Category: logging
- Action: Remove debugger statements and route startup diagnostics through configured logging after initialization.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/server/server.js:1:1`

## CR-0019-03

- ID: CR-0019-03
- Priority: high
- Status: open
- Severity: warning
- File: `D:\AI\.AI\prompts\Debug Extension Using Diagnostics.md`
- Line/Column: 1/1
- Token: `valid syntax`
- Category: documentation
- Action: Update prompt wording after the navigator state model is repaired.
- VSCodium URI: `vscode://file/D:/AI/.AI/prompts/Debug%20Extension%20Using%20Diagnostics.md:1:1`

## CR-0019-02

- ID: CR-0019-02
- Priority: high
- Status: open
- Severity: warning
- File: `docs/Developer Guide - Diagnostic Explorer.md`
- Line/Column: 1/1
- Token: `valid syntax`
- Category: documentation
- Action: Document the new parser-bug/valid-syntax queue semantics after implementation.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/docs/Developer%20Guide%20-%20Diagnostic%20Explorer.md:1:1`

## CR-0019-01

- ID: CR-0019-01
- Priority: high
- Status: open
- Severity: warning
- File: `src/diagnostics/diagnosticNavigator.js`
- Line/Column: 1/1
- Token: `validSyntax`
- Category: diagnostic-navigation
- Action: Add a separate valid-syntax/parser-bug state and keep these items visible in the repair workflow.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/diagnostics/diagnosticNavigator.js:1:1`

## CR-0030-01

- ID: CR-0030-01
- Priority: high
- Status: open
- Severity: warning
- File: `syntaxes/mydfrg.tmLanguage.json`
- Line/Column: 1/1
- Token: `Name`
- Category: parser-classification
- Action: Generate grammar keyword lists from canonical language data or add drift tests.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/syntaxes/mydfrg.tmLanguage.json:1:1`

## CR-0037-02

- ID: CR-0037-02
- Priority: high
- Status: open
- Severity: warning
- File: `test/server/fragment.test.js`
- Line/Column: 1/1
- Token: `fragment.test.js`
- Category: test-coverage
- Action: Add fragment parser tests for diagnostics, parent hints, and empty/whitespace-only fragments.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/test/server/fragment.test.js:1:1`

## CR-0037-01

- ID: CR-0037-01
- Priority: high
- Status: open
- Severity: warning
- File: `test/server/parser.test.js`
- Line/Column: 1/1
- Token: `parser.test.js`
- Category: test-coverage
- Action: Add parser fixture tests using verified MyDefrag help/BNF examples.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/test/server/parser.test.js:1:1`

## CR-0013-01

- ID: CR-0013-01
- Priority: medium
- Status: open
- Severity: error
- File: `src/server/parser.js`
- Line/Column: 1/1
- Token: `fragmentInfo`
- Category: fragment-mode
- Action: Initialize fragment trace state before the loop or guard post-loop trace updates.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/server/parser.js:1:1`

## CR-0017-01

- ID: CR-0017-01
- Priority: medium
- Status: open
- Severity: error
- File: `src/server/tokenizer.js`
- Line/Column: 1/1
- Token: `warningAtStart`
- Category: safety
- Action: Use local const message and call the local diagnostic helper directly.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/server/tokenizer.js:1:1`

## CR-0006-01

- ID: CR-0006-01
- Priority: medium
- Status: open
- Severity: warning
- File: `src/preprocess/mydefrag-preprocess.js`
- Line/Column: 1/1
- Token: `createConnection`
- Category: code-quality
- Action: Remove language-server connection creation and keep preview code as a pure CLI/library path.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/preprocess/mydefrag-preprocess.js:1:1`

## CR-0011-01

- ID: CR-0011-01
- Priority: medium
- Status: open
- Severity: warning
- File: `src/server/languageData.js`
- Line/Column: 1/1
- Token: `kwParentExists`
- Category: code-quality
- Action: Return the has() result.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/server/languageData.js:1:1`

## CR-0014-01

- ID: CR-0014-01
- Priority: medium
- Status: open
- Severity: warning
- File: `src/server/parser.js`
- Line/Column: 1/1
- Token: `backwardFileSelectAction`
- Category: fragment-mode
- Action: Add keyword parent fixture tests and align fragment classification with full-parse behavior.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/server/parser.js:1:1`

## CR-0016-01

- ID: CR-0016-01
- Priority: medium
- Status: open
- Severity: warning
- File: `src/server/tokenizer.js`
- Line/Column: 1/1
- Token: `REM`
- Category: documentation
- Action: Verify against MyDefrag help/BNF and update tokenizer behavior or comments accordingly.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/server/tokenizer.js:1:1`

## CR-0018-01

- ID: CR-0018-01
- Priority: medium
- Status: open
- Severity: warning
- File: `src/server/tokenizer.js`
- Line/Column: 1/1
- Token: `UNKNOWN`
- Category: parser-false-positive
- Action: Emit UNKNOWN tokens or tokenizer diagnostics with exact ranges.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/server/tokenizer.js:1:1`

## CR-0020-01

- ID: CR-0020-01
- Priority: medium
- Status: open
- Severity: warning
- File: `src/diagnostics/diagnosticNavigator.js`
- Line/Column: 1/1
- Token: `sendIt`
- Category: diagnostic-navigation
- Action: Capture the sent diagnostic before mutation and return the captured object.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/diagnostics/diagnosticNavigator.js:1:1`

## CR-0024-01

- ID: CR-0024-01
- Priority: medium
- Status: open
- Severity: warning
- File: `package.json`
- Line/Column: 1/1
- Token: `mydfrg.debugOn`
- Category: configuration
- Action: Default debug off and set verbose level low while keeping high verbosity configurable.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/package.json:1:1`

## CR-0025-01

- ID: CR-0025-01
- Priority: medium
- Status: open
- Severity: warning
- File: `src/server/server.js`
- Line/Column: 1/1
- Token: `workspace`
- Category: code-quality
- Action: Debounce scans, prefer opened documents first, and consider async walking with cancellation.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/server/server.js:1:1`

## CR-0026-01

- ID: CR-0026-01
- Priority: medium
- Status: open
- Severity: warning
- File: `src/server/server.js`
- Line/Column: 1/1
- Token: `diagnosticsSnapshot`
- Category: diagnostic-navigation
- Action: Debounce snapshot writes and coalesce frequent validation changes.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/server/server.js:1:1`

## CR-0028-01

- ID: CR-0028-01
- Priority: medium
- Status: open
- Severity: warning
- File: `src/shared/ini.js`
- Line/Column: 1/1
- Token: `readIni`
- Category: code-quality
- Action: Decide whether INI support is still required; add tests and repair data model or deprecate active runtime use.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/shared/ini.js:1:1`

## CR-0029-01

- ID: CR-0029-01
- Priority: medium
- Status: open
- Severity: warning
- File: `src/utilities/util.js`
- Line/Column: 1/1
- Token: `isExcluded`
- Category: code-quality
- Action: Use VS Code RelativePattern, minimatch, or a small tested glob matcher.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/utilities/util.js:1:1`

## CR-0033-03

- ID: CR-0033-03
- Priority: medium
- Status: open
- Severity: warning
- File: `docs/ExtensionStdFolderStruct.md`
- Line/Column: 1/1
- Token: `FolderStruct`
- Category: documentation
- Action: Label as target/proposal or update to reflect current repository structure.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/docs/ExtensionStdFolderStruct.md:1:1`

## CR-0033-01

- ID: CR-0033-01
- Priority: medium
- Status: open
- Severity: warning
- File: `docs/MyDefrag Project Assessment.md`
- Line/Column: 1/1
- Token: `Project Assessment`
- Category: documentation
- Action: Label as proposal/assessment or update against current implementation.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/docs/MyDefrag%20Project%20Assessment.md:1:1`

## CR-0033-02

- ID: CR-0033-02
- Priority: medium
- Status: open
- Severity: warning
- File: `docs/Parser Debug Trace Information.md`
- Line/Column: 1/1
- Token: `trace`
- Category: documentation
- Action: Update trace documentation from current parser trace output.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/docs/Parser%20Debug%20Trace%20Information.md:1:1`

## CR-0035-01

- ID: CR-0035-01
- Priority: medium
- Status: open
- Severity: warning
- File: `scripts/enable-networkDrives.ps1`
- Line/Column: 1/1
- Token: `password`
- Category: safety
- Action: Move to admin/tools area with clear warnings and avoid storing passwords.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/scripts/enable-networkDrives.ps1:1:1`

## CR-0036-01

- ID: CR-0036-01
- Priority: medium
- Status: open
- Severity: warning
- File: `scripts/add-VsCodium-ToExplorer.ps1`
- Line/Column: 1/1
- Token: `HKCR`
- Category: safety
- Action: Move to optional tooling documentation and require explicit user confirmation.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/scripts/add-VsCodium-ToExplorer.ps1:1:1`

## CR-0038-02

- ID: CR-0038-02
- Priority: medium
- Status: open
- Severity: warning
- File: `D:\AI\.AI\README.md`
- Line/Column: 1/1
- Token: `README.md`
- Category: documentation
- Action: Resolved: README exists and is human-facing, not part of the required AI load order.
- VSCodium URI: `vscode://file/D:/AI/.AI/README.md:1:1`

## CR-0038-01

- ID: CR-0038-01
- Priority: medium
- Status: closed
- Severity: information
- File: `D:\AI\.AI\START_HERE.md`
- Line/Column: 1/1
- Token: `DEBUGGING_WORKFLOW.md`
- Category: documentation
- Action: Resolved: DEBUGGING_WORKFLOW.md exists under context and START_HERE points to it.
- VSCodium URI: `vscode://file/D:/AI/.AI/START_HERE.md:1:1`

## CR-0021-01

- ID: CR-0021-01
- Priority: medium
- Status: open
- Severity: information
- File: `src/diagnostics/diagnosticNavigator.js`
- Line/Column: 1/1
- Token: `skipItem`
- Category: diagnostic-navigation
- Action: Clarify command semantics in docs or add a separate skip file command.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/diagnostics/diagnosticNavigator.js:1:1`

## CR-0023-01

- ID: CR-0023-01
- Priority: medium
- Status: open
- Severity: information
- File: `src/extension.js`
- Line/Column: 1/1
- Token: `activate`
- Category: code-quality
- Action: Split extension responsibilities into focused client modules after higher-priority runtime bugs are fixed.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/extension.js:1:1`

## CR-0031-01

- ID: CR-0031-01
- Priority: medium
- Status: open
- Severity: information
- File: `snippets/mydfrg.code-snippets`
- Line/Column: 1/1
- Token: `snippets`
- Category: test-coverage
- Action: Add snippet expansion validation for representative choices.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/snippets/mydfrg.code-snippets:1:1`

## CR-0032-01

- ID: CR-0032-01
- Priority: medium
- Status: open
- Severity: information
- File: `docs/ARCHITECTURE.md`
- Line/Column: 1/1
- Token: `ARCHITECTURE`
- Category: documentation
- Action: Prioritize current architecture, developer, diagnostics, language reference, and install documentation.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/docs/ARCHITECTURE.md:1:1`

## CR-0032-02

- ID: CR-0032-02
- Priority: medium
- Status: open
- Severity: information
- File: `docs/COMMANDS.md`
- Line/Column: 1/1
- Token: `COMMANDS`
- Category: documentation
- Action: Fill command documentation from current package contributions and implementation.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/docs/COMMANDS.md:1:1`

## CR-0032-03

- ID: CR-0032-03
- Priority: medium
- Status: open
- Severity: information
- File: `docs/DEVELOPER.md`
- Line/Column: 1/1
- Token: `DEVELOPER`
- Category: documentation
- Action: Document current development workflow, source layout, validation, and packaging constraints.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/docs/DEVELOPER.md:1:1`

## CR-0032-04

- ID: CR-0032-04
- Priority: medium
- Status: open
- Severity: information
- File: `docs/DIAGNOSTICS.md`
- Line/Column: 1/1
- Token: `DIAGNOSTICS`
- Category: documentation
- Action: Document current diagnostics, navigator state, snapshots, and parser-bug workflow.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/docs/DIAGNOSTICS.md:1:1`

## CR-0032-05

- ID: CR-0032-05
- Priority: medium
- Status: open
- Severity: information
- File: `docs/FEATURES.md`
- Line/Column: 1/1
- Token: `FEATURES`
- Category: documentation
- Action: Update feature documentation against implemented behavior.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/docs/FEATURES.md:1:1`

## CR-0032-06

- ID: CR-0032-06
- Priority: medium
- Status: open
- Severity: information
- File: `docs/INSTALL.md`
- Line/Column: 1/1
- Token: `INSTALL`
- Category: documentation
- Action: Document safe install/package steps once build and deploy scripts are separated.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/docs/INSTALL.md:1:1`

## CR-0032-07

- ID: CR-0032-07
- Priority: medium
- Status: open
- Severity: information
- File: `docs/LANGUAGE_REFERENCE.md`
- Line/Column: 1/1
- Token: `LANGUAGE_REFERENCE`
- Category: documentation
- Action: Build the language reference from canonical parser/language data and verified MyDefrag sources.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/docs/LANGUAGE_REFERENCE.md:1:1`

## CR-0032-08

- ID: CR-0032-08
- Priority: medium
- Status: open
- Severity: information
- File: `docs/LANGUAGE_SERVER.md`
- Line/Column: 1/1
- Token: `LANGUAGE_SERVER`
- Category: documentation
- Action: Document current server validation, scanning, snapshots, and logging behavior.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/docs/LANGUAGE_SERVER.md:1:1`

## CR-0032-09

- ID: CR-0032-09
- Priority: medium
- Status: open
- Severity: information
- File: `docs/PREVIEW.md`
- Line/Column: 1/1
- Token: `PREVIEW`
- Category: documentation
- Action: Document current preview command behavior after preview traversal bugs are fixed.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/docs/PREVIEW.md:1:1`

## CR-0032-10

- ID: CR-0032-10
- Priority: medium
- Status: open
- Severity: information
- File: `docs/QUICKSTART.md`
- Line/Column: 1/1
- Token: `QUICKSTART`
- Category: documentation
- Action: Document a minimal verified first-use workflow after packaging is safe.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/docs/QUICKSTART.md:1:1`

## CR-0032-11

- ID: CR-0032-11
- Priority: medium
- Status: open
- Severity: information
- File: `docs/SETTINGS.md`
- Line/Column: 1/1
- Token: `SETTINGS`
- Category: documentation
- Action: Document current mydfrg settings and safe defaults.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/docs/SETTINGS.md:1:1`

## CR-0032-12

- ID: CR-0032-12
- Priority: medium
- Status: open
- Severity: information
- File: `docs/SNIPPETS.md`
- Line/Column: 1/1
- Token: `SNIPPETS`
- Category: documentation
- Action: Document snippet behavior after snippet grammar verification exists.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/docs/SNIPPETS.md:1:1`

## CR-0037-04

- ID: CR-0037-04
- Priority: medium
- Status: open
- Severity: information
- File: `test/client/documentLinks.test.js`
- Line/Column: 1/1
- Token: `documentLinks.test.js`
- Category: test-coverage
- Action: Add fixture tests for include/file/batch command link resolution and ranges.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/test/client/documentLinks.test.js:1:1`

## CR-0037-06

- ID: CR-0037-06
- Priority: medium
- Status: open
- Severity: information
- File: `test/diagnostics/navigator.test.js`
- Line/Column: 1/1
- Token: `navigator.test.js`
- Category: test-coverage
- Action: Add diagnostic navigator state-transition tests for the triage workflow commands.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/test/diagnostics/navigator.test.js:1:1`

## CR-0037-07

- ID: CR-0037-07
- Priority: medium
- Status: open
- Severity: information
- File: `test/package/vsixContents.test.js`
- Line/Column: 1/1
- Token: `vsixContents.test.js`
- Category: test-coverage
- Action: Add package verification that asserts VSIX contains extension entrypoint and required assets.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/test/package/vsixContents.test.js:1:1`

## CR-0037-05

- ID: CR-0037-05
- Priority: medium
- Status: open
- Severity: information
- File: `test/preprocess/preview.test.js`
- Line/Column: 1/1
- Token: `preview.test.js`
- Category: test-coverage
- Action: Add tests for include traversal, path normalization, and cycle detection.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/test/preprocess/preview.test.js:1:1`

## CR-0037-03

- ID: CR-0037-03
- Priority: medium
- Status: open
- Severity: information
- File: `test/server/tokenizer.test.js`
- Line/Column: 1/1
- Token: `tokenizer.test.js`
- Category: test-coverage
- Action: Add tokenizer tests covering lexical edge cases and unknown-character handling.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/test/server/tokenizer.test.js:1:1`

## CR-0027-01

- ID: CR-0027-01
- Priority: low
- Status: open
- Severity: warning
- File: `src/server/server.js`
- Line/Column: 1/1
- Token: `logger.warn`
- Category: logging
- Action: Simplify logger API or add overload handling for message-only calls.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/server/server.js:1:1`

## CR-0027-02

- ID: CR-0027-02
- Priority: low
- Status: open
- Severity: warning
- File: `src/shared/logger.js`
- Line/Column: 1/1
- Token: `warn`
- Category: logging
- Action: Simplify logger API or add overload handling for message-only calls.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/shared/logger.js:1:1`

## CR-0015-01

- ID: CR-0015-01
- Priority: low
- Status: open
- Severity: information
- File: `src/server/parser.js`
- Line/Column: 1/1
- Token: `console.log`
- Category: logging
- Action: Remove console logging or route it through the configured trace logger.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/server/parser.js:1:1`

## CR-0022-01

- ID: CR-0022-01
- Priority: low
- Status: open
- Severity: information
- File: `src/diagnostics/diagnosticTreeProvider.js`
- Line/Column: 1/1
- Token: `green`
- Category: tree-view
- Action: Use documented theme color IDs or avoid fixed theme colors.
- VSCodium URI: `vscode://file/D:/Script/MyDefrag-syntax/src/diagnostics/diagnosticTreeProvider.js:1:1`

## CR-0034-01

- ID: CR-0034-01
- Priority: low
- Status: open
- Severity: information
- File: `D:\AI\.AI`
- Line/Column: 1/1
- Token: `*`
- Category: documentation
- Action: Run markdown linting after deciding the desired style and fix malformed list/bold markers.
- VSCodium URI: `vscode://file/D:/AI/.AI:1:1`
