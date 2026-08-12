# Execution Record - Application Integrity Audit

## Table of Contents

- [Run](#run)
- [Task](#task)
- [Inputs and Scope](#inputs-and-scope)
- [Actions](#actions)
- [Commands and Results](#commands-and-results)
- [Deletion Audit](#deletion-audit)
- [Tests](#tests)
- [Packaging and Dependencies](#packaging-and-dependencies)
- [Source-Control Follow-up](#source-control-follow-up)
- [Directory-Diff Follow-up](#directory-diff-follow-up)
- [Generator Recovery](#generator-recovery)
- [Icon Creation](#icon-creation)
- [Dependency and Electron Repair](#dependency-and-electron-repair)
- [Files Read and Changed](#files-read-and-changed)
- [Decisions](#decisions)
- [Diagnostics and Fallbacks](#diagnostics-and-fallbacks)
- [Validation](#validation)
- [Outcome and Follow-up](#outcome-and-follow-up)
- [Metrics](#metrics)

## Run

- Execution ID: `20260810-application-integrity-audit`
- Date: `2026-08-10`
- Agent: Codex, Debugger and Test Engineer roles
- Project ID: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- AI root used for startup: `D:\AI\.AI`

## Task

Check the entire application after restoration of the grammar and snippet
folders, run available tests, and determine whether other files were deleted.

## Inputs and Scope

- Current dirty working tree and package metadata.
- Restored `syntaxes` and `snippets` folders.
- Source, build applications, language catalogs, dependencies, Git history,
  package listings, existing test files, and VSCodium packaging tooling.
- Verification only; no source, dependency, generated-output, or repair change.

## Actions

- Inventoried package scripts, test files, source files, and manifest assets.
- Parsed JSON, syntax-checked JavaScript, resolved literal imports, and compared
  contributed commands with registrations.
- Validated the restored grammar repository references and snippet shapes.
- Audited deletion history from the parent of `2df08808` through current HEAD.
- Ran all available non-GUI test scripts and safe validation commands.
- Checked production dependency loading and npm dependency-tree health.
- Inspected npm and VSCE package lists without publishing or creating a package.

## Commands and Results

- `git status --short`: confirmed substantial pre-existing changes and that the
  two restored folders remain untracked.
- JSON/manifest/lock scan: all examined JSON parsed; package and lock root
  declarations agreed; grammar and snippets matched pre-deletion Git blobs.
- `node --check`: 73 of 73 JavaScript files passed.
- Literal import scan: 259 imports resolved, with `vscode` treated as a host API.
- Command audit: all 21 contributed commands have static registrations; three
  additional registered diagnostic commands are internal.
- `npm run language:validate`: passed with zero errors and the existing `fr-CA`
  metadata-only warning.

## Deletion Audit

- Commit `2df08808fac9a416439d67e2eac91cfec813f930` deleted 13,470 tracked paths,
  primarily tracked dependencies and historical run records.
- Compared with the current tree, 18 non-`node_modules`, non-`runs` paths from
  that commit remain absent.
- Seven absent PowerShell files are still directly referenced by package scripts:
  build/deploy, live update, VSIX pack, VSX publish, network-drive enablement,
  symlink listing, and VSCodium Explorer integration.
- Two old language scripts are superseded by `build\scripts` equivalents.
- Two legacy locale catalogs are intentionally rejected by the current language
  builder and should not be restored under their old names.
- The old `resources\logo.gif` and `resources\logo.png` remain absent. The current
  manifest instead references `resources\icons\logo.svg`, which has never existed
  in Git or installed 0.4.0.
- The help-review script and two unreferenced development utilities also remain
  absent. An experimental diagnostics copy and a source-tree inventory document
  remain absent but are not imported by the application.
- No other active `src` runtime module from the deletion remains missing.

## Tests

- Diagnostics: 6 passed, 0 failed.
- Language runtime script: failed because the `zh-Hans` generated preview text
  is `BEGIN [depth 2]` while the contract expects `BEGIN [depth:2]`.
- Language report/additive catalog tests: passed.
- Language Maintenance app: 36 passed, 1 failed during module loading.
- Locale Maintenance app: 20 passed, 1 failed during module loading.
- Both app failures have the same dependency cause: `fast-uri` lacks
  `lib\utils.js` and `lib\schemes.js`, so AJV cannot load.

## Packaging and Dependencies

- Direct production module loading: four passed; AJV failed through incomplete
  `fast-uri` content.
- Top-level `npm ls`: three declared development dependencies missing and 31
  extraneous partial packages.
- Deep production-tree report: 33 missing and 31 extraneous dependency entries;
  many belong to partially retained VSCE-related packages.
- Normal `vsce ls` failed because npm dependency validation failed.
- `vsce ls --no-dependencies`: listed 432 extension files and included the
  restored grammar and snippets, but not the missing view-container icon.
- `npm pack --dry-run --ignore-scripts`: listed 1,522 files and included both
  restored assets; this npm listing does not replace VSIX dependency validation.
- Build, deploy, VSIX pack, and publish scripts are unavailable because their
  referenced PowerShell files remain missing.

## Source-Control Follow-up

- After the user restored the application files, staged 32 confirmed restored
  files under `resources`, `scripts`, `snippets`, `syntaxes`, and `src`.
- Left unrelated modified files, AI state, logs, and run records unstaged.
- No commit was created; a commit is still required for durable repository
  protection and propagation to other clones.
- `git diff --cached --check` found pre-existing trailing whitespace in five of
  the restored files. No content was altered during staging.

## Directory-Diff Follow-up

- Ran `dircmd` recursively in a directory-only difference mode against
  `D:\Script\MyDefrag-syntax-Vs_0_4_0`.
- The report contained 840 missing directories: 803 under `node_modules`, 19
  under the superseded `build\app` and `build\locale-app` paths, and 18 under
  three historical `runs` date directories.
- Confirmed that `build\mdl-language-app` and `build\mdl-locale-app` replace the
  two older application paths; those older directories should not be copied.
- Dependency directories should be reconstructed from the lockfile rather than
  copied from the snapshot.
- If historical execution records are to be preserved, the only directories to
  copy are `runs\2026-07-08`, `runs\2026-07-10`, and `runs\2026-07-11`.

## Generator Recovery

- Searched the 0.4.0 and 0.5.0 trees plus recent import backups and archives for
  `scripts\generate-vscodeignore.js`.
- Recovered the latest pre-deletion Git blob,
  `67278c7d5529a2c4a085ce4508a016af408ea96c`, into the current `scripts`
  directory and staged it.
- Verified the restored content reproduces the exact blob hash and passes
  `node --check`.

## Icon Creation

- Inspected the legacy marketing icons and selected the preferred Right atom
  design.
- Added `MdmIconRight.svg` and `MdmIconRight24Mono.svg` to the marketing icon
  folder without replacing or deleting existing assets.
- Added the 24-by-24 single-color SVG to `resources\icons\logo.svg` and staged
  it, resolving the existing manifest reference.
- Rendered both SVGs for visual inspection, parsed them as XML, checked them for
  scripts and external resources, confirmed the project and marketing mono
  files have matching hashes, and confirmed VSCE includes the project icon.

## Dependency and Electron Repair

- Reproduced the missing `fast-uri\lib\utils.js` and `lib\schemes.js` failure
  and captured complete content hashes for both maintenance applications.
- Reconstructed the root dependency tree from `package-lock.json` with project
  lifecycle scripts disabled; 537 packages were installed.
- Rebuilt only the package-local hooks for `@vscode/vsce-sign`,
  `electron-winstaller`, and `keytar`; the project `prepare` script did not run.
- Restored Electron 43.2.0, the npm Electron launcher, AJV, and the complete
  `fast-uri` 3.1.5 package.
- `npm ls --all` and normal VSCE dependency/package listing now pass.
- Language Maintenance tests passed 66 of 66; Locale Maintenance tests passed
  35 of 35; diagnostics passed 6 of 6; language report and language validation
  passed. The previously identified Chinese `depth:` runtime test remains the
  only failure and is independent of dependency repair.
- Before-and-after hashes prove `build\mdl-language-app` and
  `build\mdl-locale-app` were unchanged. The root `package-lock.json` was also
  unchanged.
- Preserved the partial prior dependency tree instead of deleting it. Most is
  at `D:\Script\MyDefrag-syntax-node_modules-incomplete-20260810`; one 111,073
  byte `default_app.asar` remains under `.dependency-backup` because VSCodium
  PID 24152 holds it open.
- The clean installation changed four already tracked generated dependency
  files under `node_modules`: the three VSCE shims and `.package-lock.json`.
  They were left unstaged.

## Files Read and Changed

- Read application source, package metadata, lock data, restored assets, tests,
  language build code and outputs, Git history, and installed/global tool data.
- Added and updated only this execution record.
- Staged the 32 restored application files without changing their content.
- No dependency, generated catalog, or restored asset content was changed.

## Decisions

- Preserved the dirty worktree and did not install or prune dependencies.
- Did not run mutating language build/report/catalog-generation commands.
- Did not run destructive clean, publish, install, or GUI packaging operations.
- Classified deleted files by current references and replacements rather than
  assuming every historical deletion should be reversed.

## Diagnostics and Fallbacks

- The first npm dry run could not write to the sandboxed npm cache; the same
  read-only dry run succeeded using the normal cache after approval.
- A broad historical deletion listing was truncated; filtered counts and the
  complete non-dependency set were obtained with narrower queries.
- Live Extension Development Host behavior was not re-tested after restoration.

## Validation

- Restored grammar: 15 patterns, 15 repository rules, zero missing includes.
- Restored snippets: 118 entries; JSON and basic prefix/body shapes valid.
- Both restored files exactly match the revision before their deletion.
- Manifest integrity is not clean because its view-container icon is absent.
- Dependency, language-runtime, application-test, and package-script integrity
  are not clean for the independently confirmed reasons above.

## Outcome and Follow-up

- Outcome: partial integrity only. Core source syntax/import closure and most
  tests pass, but the application is not buildable or package-verifiable as-is.
- Follow-up repair should restore the npm tree from the lockfile, supply or
  correct the view icon, commit the staged restored application files, and
  resolve the preview-format regression.

## Metrics

- JavaScript syntax checks: 73 passed, 0 failed.
- Literal imports: 259 resolved, 0 unresolved.
- Node test cases: 62 passed, 2 failed.
- Additional scripted suites: 1 passed, 1 failed.
- Language validation: 0 errors, 1 warning.
- Missing directly referenced script files after restoration: 0.
- Missing manifest asset paths: 0.
- Restored and newly supplied application files staged: 34.
- Application/source repairs: 0.
- Elapsed time: Unavailable.

## Component Catalog Add Record Layout Follow-up

- Kept the All Candidates title and package coverage summary on one rendered
  line, with the path title retaining ellipsis behavior when space is limited.
- Scoped the compact layout to Component Catalog Add Record: reduced card,
  status, preview, form, field, and action spacing; placed Previous and Next on
  one row; and reduced all buttons in the card to the same small treatment.
- Moved the candidate status and catalog field names into a fixed left column,
  top-aligned with their controls. Source Transform Preview remains a full-width
  block as requested.
- Removed the sentence `Candidate decisions are saved with the migration
  inventory.` from the candidate status section.
- Added static renderer/style regression assertions for the title row, scoped
  Add Record class, removed sentence, compact buttons, and two-column fields.
- `npm run test:language-app` passed 71 of 71 tests after the final CSS changes;
  `node --check` and `git diff --check` also passed. The latter reported only
  the repository's existing LF-to-CRLF conversion warnings.
- The Computer Use Node runtime was unavailable (`The system cannot find the
  path specified`). As a fallback, launched the repaired Electron 43.2.0 app
  outside the sandbox and inspected the live renderer through its local Chrome
  debugging endpoint. No field, draft, or source change was applied.
- Live package.json measurements confirmed the title and counts share one row,
  all eight Add Record buttons render at 21.7 pixels high, field label and
  control tops match, the removed sentence is absent, and the compact card is
  approximately 80 pixels shorter than the first rendered revision.
- Closed the candidate dialog and application after inspection. No Electron
  inspection process was left running.

## Catalog Matches Navigation Alignment Follow-up

- Put Catalog Matches Previous and Next beside each other on the first action
  row and kept Close candidates on the row below.
- Gave the Catalog Matches card the same compact padding, action gap, button
  sizing, and minimum button width as Component Catalog Add Record.
- Reserved a stable scrollbar gutter in the candidate editor so switching
  between the taller Add Record form and shorter Catalog Matches card cannot
  horizontally shift the navigation pair.
- Added renderer/style regression assertions for the Catalog Matches card,
  action grid, button positions and dimensions, and stable scrollbar gutter.
- Live Electron measurements confirmed exact equality between both views:
  Previous at x=1186, y=76.4, 86.6 by 21.7 pixels; Next at x=1275.5,
  y=76.4, 72 by 21.7 pixels. All coordinate deltas were zero.
- `npm run test:language-app` passed 71 of 71 tests; `node --check` and
  `git diff --check` passed with only the existing LF-to-CRLF warnings.
- No catalog, migration, source, or draft data was changed or saved during the
  live inspection.
