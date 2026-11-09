# MyDefrag Syntax Implementation Plan

## Table of Contents

- [Document Control](#document-control)
- [Purpose](#purpose)
- [Status Language](#status-language)
- [Current Baseline](#current-baseline)
- [Product And Repository Boundaries](#product-and-repository-boundaries)
- [Version Strategy](#version-strategy)
- [Implementation Order](#implementation-order)
- [Version 0.5.0 - Stabilization And Integration](#version-050---stabilization-and-integration)
  - [V050-01 - Reconcile The Working Tree](#v050-01---reconcile-the-working-tree)
  - [V050-02 - Repair Runtime-Syntax Protection](#v050-02---repair-runtime-syntax-protection)
  - [V050-03 - Preserve The Entry Root During Include Expansion](#v050-03---preserve-the-entry-root-during-include-expansion)
  - [V050-04 - Reconcile Documentation And Trackers](#v050-04---reconcile-documentation-and-trackers)
  - [V050-05 - Qualify And Package Version 0.5.0](#v050-05---qualify-and-package-version-050)
- [Version 0.6.0 - Editor Intelligence](#version-060---editor-intelligence)
- [Version 0.7.0 - Non-Destructive Keyword Translation](#version-070---non-destructive-keyword-translation)
- [Version 0.8.0 - Translation Review Workbench](#version-080---translation-review-workbench)
- [Version 0.9.0 - Localization And Compatibility Qualification](#version-090---localization-and-compatibility-qualification)
- [Version 1.0.0 - Public Release](#version-100---public-release)
- [Version 1.1.0 And Later](#version-110-and-later)
- [Validation Gates](#validation-gates)
- [Documentation And Release Gates](#documentation-and-release-gates)
- [Risks And Controls](#risks-and-controls)
- [Decisions Required](#decisions-required)
- [Completion Definition](#completion-definition)
- [Evidence Sources](#evidence-sources)

## Document Control

<!-- markdownlint-disable MD013 -->

| Field | Value |
| --- | --- |
| Document version | 1.6.0 |
| Status | Current working implementation plan |
| Baseline date | 2026-11-08 |
| Project | MyDefrag Syntax |
| Project root | `D:\Script\MyDefrag-syntax` |
| Current source version | 0.8.0 |
| Installed VSCodium extension | `macrodm.mydefrag-syntax@0.6.0` in the primary profile |
| Last packaged-host VSCodium smoke | `macrodm.mydefrag-syntax@0.7.0` in an isolated profile |
| Version authority | 0.8.0 is the implemented working-tree target; 0.9.0 and later remain proposals |
| Supersedes | Earlier revisions of this file; no competing consolidated plan |

<!-- markdownlint-enable MD013 -->

The stable filename is intentional. Future revisions should update the document
version and baseline date instead of creating competing plan files.

## Purpose

This document converts the current repository status, known defects, existing
roadmaps, and release goals into one ordered implementation plan. It separates:

- Verified current facts from proposed version assignments.
- Immediate stabilization work from feature development.
- MyDefrag Syntax responsibilities from work owned by related projects.
- Source validation from packaged-extension and real-runtime qualification.

This plan does not declare unfinished work complete. It also does not authorize
a Git commit, push, installation, marketplace publication, or MyDefrag runtime
execution.

## Status Language

<!-- markdownlint-disable MD013 -->

| Status | Meaning |
| --- | --- |
| Verified | Observed in the repository or reproduced on 2026-11-08 |
| In progress | Present in the uncommitted working tree but not release-qualified |
| Planned | Accepted by an existing roadmap but not yet verified as implemented |
| Proposed | Recommended here and requiring approval before it becomes a release commitment |
| Blocked | Cannot pass its gate until a named defect or decision is resolved |
| Out of scope | Owned by another project or intentionally excluded from this plan |

<!-- markdownlint-enable MD013 -->

## Current Baseline

<!-- markdownlint-disable MD013 -->

| Area | Verified status | Consequence |
| --- | --- | --- |
| Task queue | Idle; zero queued tasks | This plan is an ad hoc authorized document, not a consumed queue task |
| Git branch | `main` at `26455349`, zero commits ahead of or behind `origin/main` | No commit or push is authorized by this plan update |
| Working tree | 99 entries: 73 tracked modifications and 26 untracked paths for the layered 0.7.0 keyword-translation and 0.8.0 review-workbench implementations | Preserve this scope and classify generated inputs and outputs before staging |
| Prior broad diff | The former 426-entry working tree is contained in `8ebf3b77` | New work no longer overlaps an uncommitted repository-wide diff |
| Product version | Both package manifests declare 0.8.0 | 0.8.0 is the active review-workbench target |
| Primary installed extension | VSCodium 1.135.06055 x64 reports `macrodm.mydefrag-syntax@0.6.0` | Source, current package, and the primary installed profile intentionally differ until installation is authorized |
| Packaged-host smoke | An isolated VSCodium profile qualified 0.7.0 from its exact inspected VSIX | 0.8.0 was packaged and inspected but not installed because installation was not authorized |
| Focused translation tests | 30 of 30 passed | Catalog, translation, preview, hover, and manifest behavior passed |
| Focused 0.8.0 review tests | 18 of 18 passed | Translation preview, all six review renderers, and the thirteen-command manifest passed |
| Editor-intelligence tests | 10 of 10 passed | Completion, directive actions, stale-edit rejection, and live LSP ownership pass the dedicated harness lane |
| Complete 0.8.0 source gate | 378 of 378 named tests passed across 159 executions | All 16 syntax, function, language, app, and coverage checks passed |
| Node coverage | 79.55% lines, 63.92% branches, 73.64% functions | The new review renderer has 98.08% line, 89.00% branch, and 100% function coverage |
| Locale Maintenance tests | 67 of 67 passed | Runtime-syntax protection is repaired |
| JavaScript syntax checks | 101 of 101 passed | Extension, language-app, tooling, and test JavaScript parsed successfully |
| Language validation | Passed with zero errors and one warning | Normalized-input cleanup remains open |
| Localization data | 18 locales, 10 components, and 243 keyword IDs per locale | 214 entries are source-visible and 29 internal grammar labels are hidden |
| Non-English approval | 14 locales require native review; 3 are draft | No non-English locale is release-approved |
| Generated localization | 12,098 machine-generated and 1,649 fallback entries | Human review and fallback reduction remain material work |
| Normalized-input audit | The latest validation gate reported 191 occurrences in 32 files; the retained JSON snapshot still records 190 | The audit remains partial and the generated report discrepancy must be reconciled before release |
| Help review | 142 converted topics are marked pending | Conversion exists, but independent review is unfinished |
| Historical 0.5.0 package qualification | The generic artifact path held 0.5.0 at qualification time and has since been replaced | 0.5.0 was 2,509,402 bytes with SHA-256 `715665186F261F395A94275413224665989B810828C3AC721591CF9ADB820853` |
| 0.6.0 packaged artifact | `artifacts\mydefrag-syntax-0.6.0-Release.vsix` | 2,513,966 bytes; 1,521 files; SHA-256 `763D7CFF4C196601BDA2AE33B4987FB6115E7756A78102AD06BBB9BB375C7BCD` |
| Historical 0.7.0 package qualification | The generic artifact path held 0.7.0 at qualification time and now holds 0.8.0 | 2,722,312 bytes; 1,578 files; SHA-256 `F0F3AFA2870A2A8DEA700700C990B9528891E5813E1646D3442E25004BCA24B9` |
| 0.8.0 packaged artifact | `artifacts\mydefrag-syntax-Release.vsix` | 2,726,131 bytes; 1,579 files; SHA-256 `C13017B0571F140B4EBF7D1FA47C820C88B0E519C3085E58B8165CC474298932` |

<!-- markdownlint-enable MD013 -->

## Product And Repository Boundaries

MyDefrag Syntax owns:

- The VSCodium and Visual Studio Code extension under `src\`.
- Parser, tokenizer, diagnostics, navigation, hover, completion, and preview
  behavior.
- Project-authored language definitions under `language\`.
- Generated language outputs and reports under `build\language\`.
- The Locale Maintenance application under `build\mdl-locale-app\`.
- Extension packaging, tests, and documentation in this repository.

Related-project boundaries are:

- `D:\MdmLocalize` owns the independent Language Maintenance application, its
  application source, tests, packaging, and documentation. MyDefrag Syntax
  continues to own the language data that MdmLocalize opens as a project.
- TaylorDo owns its MyDefrag scripts, configuration, scheduling, installer,
  and runtime integration.
- MyDefrag executes the original `.MyD` script and expands runtime includes.
  Preview output is an editor and diagnostic artifact unless explicitly saved
  and intentionally executed.

Items in `ToDo.txt` must be classified against these boundaries before repair.
An item owned by MdmLocalize should be moved to that project's tracker rather
than fixed through duplicated code here.

## Version Strategy

Version 0.8.0 is currently declared by the repository working tree. The 0.5.0
through 0.8.0 assignments are implemented history or current fact. Version
0.9.0 and later remain proposed sequencing boundaries and may be split or
combined after review.

<!-- markdownlint-disable MD013 -->

| Target | Theme | Current status | Entry condition | Exit condition |
| --- | --- | --- | --- | --- |
| 0.5.0 | Stabilization and integration | Completed and qualified | Broad uncommitted baseline | Clean required tests, reconciled scope, fresh verified VSIX |
| 0.6.0 | Editor intelligence | Completed and qualified | 0.5.0 qualified | LSP completion and safe code-action foundation qualified |
| 0.7.0 | Non-destructive keyword translation | Implemented; source, package, and isolated-host qualified | Stable editor contracts | Canonical and selected-locale previews plus bilingual hover qualified |
| 0.8.0 | Translation review workbench | Implemented; source and package qualified, packaged-host smoke pending | Translation service qualified | Review views qualify in source/package gates and the exact VSIX passes the isolated-host workflow matrix |
| 0.9.0 | Localization and compatibility qualification | Proposed | 0.8.0 worktree recoverable and exact package qualified in an authorized host | Native-review, project-symbol, compatibility, and low-resource gates resolved |
| 1.0.0 | Public release | Planned; not release-ready | Release candidate accepted | Documentation, package, install, and publication gates complete |
| 1.1.0+ | Post-release evolution | Proposed | 1.0.0 released | Feedback-driven maintenance and approved enhancements |

<!-- markdownlint-enable MD013 -->

## Implementation Order

Work should proceed in this order:

1. Preserve and classify the current 99-entry 0.7.0 and 0.8.0 working-tree
   scope, including authoritative language inputs and generated outputs.
2. Reconcile the multilingual roadmap checkboxes and the 191-versus-190
   normalized-input report discrepancy without regenerating unrelated output.
3. Install and smoke-test the exact 0.8.0 VSIX in an isolated VSCodium profile
   only after installation is explicitly authorized.
4. Approve the 0.7.0 and 0.8.0 staging and checkpoint strategy before starting
   overlapping 0.9.0 implementation; commit and push remain separate approval
   boundaries.
5. Approve or revise the 0.9.0 boundary, release-target locales, Help-review
   gate, and authoritative issue tracker.
6. Implement the remaining safe source-conversion actions, project symbol
   indexing, and collision-safe variable translation.
7. Generate and validate the French (Quebec) TaylorDo source tree without
   crossing the TaylorDo runtime-ownership boundary.
8. Complete native-review, normalized-input, Unicode, right-to-left,
   compatibility, offline, and low-resource qualification.
9. Run the full 0.9.0 source and package gates, then select 1.0.0 release work
   from retained evidence.

## Version 0.5.0 - Stabilization And Integration

### V050-01 - Reconcile The Working Tree

Status: Completed by checkpoint commit `8ebf3b77`. The branch was clean and
synchronized before the scoped stabilization implementation began.

Objective: turn the current broad, uncommitted state into reviewable ownership
and delivery units without losing user work.

Implementation tasks:

- Capture `git status --short`, `git diff --stat`, and root-level change counts
  before edits or staging.
- Classify every changed or untracked path as authored source, generated output,
  migrated application content, documentation, test artifact, or local-only
  file.
- Confirm that deletion of `build\mdl-language-app\` corresponds only to the
  completed move to `D:\MdmLocalize`.
- Verify the authoritative source for generated catalogs before accepting large
  generated diffs.
- Separate source, tests, documentation, generated language output, and cleanup
  into reviewable staging groups.
- Preserve unrelated changes and do not use destructive Git recovery commands.

Acceptance criteria:

- Every one of the 426 current status entries has an ownership classification.
- No file is deleted solely because it appears obsolete.
- Generated outputs can be reproduced from their authoritative inputs.
- The intended 0.5.0 change set is distinguishable from local-only files.
- A staging plan exists before any commit is requested.

### V050-02 - Repair Runtime-Syntax Protection

Status: Completed. Placeholder-shaped path segments no longer collapse
`{index}/{total}` into one path token, adjacent tokens retain order, and all 67
Locale Maintenance tests pass.

Objective: restore the complete Locale Maintenance test gate.

Verified defect:

- `deepl-translation-service.test.js` expects seven protected runtime tokens but
  receives five.
- `google-translation-service.test.js` expects the same seven-token contract
  and receives five.
- The current direct suite result is 65 passed and 2 failed.

Implementation tasks:

- Trace `transformRuntimeSyntax` and both provider-specific protection layers.
- Define one shared contract for placeholders, command icons, extensions, URLs,
  and JavaScript template expressions.
- Correct token recognition without translating or corrupting protected syntax.
- Retain provider-specific XML and HTML wrappers only at the provider boundary.
- Add focused cases for adjacent protected tokens and restoration order.
- Verify that rejected provider output cannot change the authored draft.

Acceptance criteria:

- Both currently failing tests pass.
- The complete Locale Maintenance suite passes 67 of 67.
- Restored text is byte-for-byte identical for protected runtime syntax.
- Existing placeholder validation and credential-redaction tests continue to
  pass.

### V050-03 - Preserve The Entry Root During Include Expansion

Status: Completed. Recursive include resolution now retains the launched entry
directory, with raw and annotated regression coverage for `.MyD`, `.MyDc`,
`.MyDs`, `.txt`, and an arbitrary `.fragment` target.

Objective: make preview include resolution match the established `.MyD` entry
model.

Verified defect:

- `src\preprocess\mydefrag-preprocess.js` derives `includeDir` from the current
  child file and resolves the next include from that directory.
- Nested includes must retain the launched `.MyD` entry directory throughout
  recursion.
- Existing focused tests pass because their fixture does not exercise the
  failing nested-directory layout.

Implementation tasks:

- Pass an immutable `entryRoot` or equivalent context into every recursive
  `processFile` call.
- Resolve relative includes against the entry root while preserving absolute
  paths and arbitrary include extensions.
- Keep source ownership, line mapping, missing-include evidence, and circular
  include detection unchanged.
- Remove unused or duplicate include-path calculations after behavior is
  covered.
- Add fixtures with `main.MyD`, nested `.MyDc` files, and mixed-extension
  includes whose targets exist only relative to the entry root.
- Cover raw and annotated preview modes.

Acceptance criteria:

- Nested includes do not produce false paths such as `Settings\Settings`.
- `.MyD`, `.MyDc`, `.MyDs`, `.txt`, and other textual include targets remain
  eligible.
- Missing and circular include diagnostics still identify the referring source
  file and line.
- Focused preview tests and the full fast gate pass.

### V050-04 - Reconcile Documentation And Trackers

Status: Completed. Application issues moved to the MdmLocalize tracker, the
repository-owned report issue is fixed, hover and Help-review documentation is
current, and the duplicate multilingual roadmap filename now redirects to one
canonical roadmap.

Objective: make current documentation describe the implemented repository and
its actual ownership boundaries.

Implementation tasks:

- Classify the ten entries in `ToDo.txt` by component and project owner.
- Move MdmLocalize-owned issues to the MdmLocalize tracker without duplicating
  their implementation here.
- Reconcile the old multilingual plan with implemented `fr-CA`, preview modes,
  current locale counts, and current translation reports.
- Correct the documentation index link that currently targets a missing copy of
  the multilingual feature plan under `docs\`.
- Update feature documentation that still describes hover as unimplemented.
- Distinguish converted MyDefrag Help from independently reviewed Help.
- Retain the 142 pending review entries until each topic is actually reviewed.

Acceptance criteria:

- Each open tracker item has one owner, one destination, and one status.
- Documentation contains no known missing internal project link.
- Implemented features are not listed as wholly unimplemented.
- Proposed features are not described as current behavior.
- The project has one canonical implementation plan and one canonical
  multilingual roadmap reference.

### V050-05 - Qualify And Package Version 0.5.0

Status: Source and package qualification completed. The exact VSIX is installed
in VSCodium and the baseline packaged-host activation smoke passed. The broader
interactive workflow matrix below remains open.

Objective: prove the reconciled source and create one exact, inspectable VSIX.

Run the following from `D:\Script\MyDefrag-syntax`:

```powershell
npm run language:validate
npm run test:fast
npm run test:all
npm run test:manifest
git diff --check
npm run pack:vsix
Get-Item .\artifacts\mydefrag-syntax-Release.vsix
```

Expected results:

- Language validation reports zero errors. Any remaining warning is listed in
  the release evidence and assigned an owner.
- Fast, all, manifest, application, and language suites report zero failures.
- `git diff --check` reports no whitespace errors. Line-ending conversion
  warnings are reviewed separately and not hidden.
- Packaging creates exactly
  `D:\Script\MyDefrag-syntax\artifacts\mydefrag-syntax-Release.vsix`.
- VSIX contents include the declared runtime entry points, grammar, snippets,
  language catalogs, and required dependencies.

With installation explicitly authorized, the exact artifact was installed
using:

```powershell
codium --install-extension .\artifacts\mydefrag-syntax-Release.vsix --force
codium --list-extensions --show-versions | findstr /I mydefrag-syntax
```

The expected installed result is:

```text
macrodm.mydefrag-syntax@0.5.0
```

Complete an Extension Development Host and packaged-host smoke test covering:

- Extension activation.
- `.MyD` and `.MyDc` language selection.
- Diagnostics and hover.
- Preview creation in all five existing modes.
- Missing and circular include reporting.
- Editable untitled preview behavior.
- Installed extension version and artifact freshness.

Publishing to GitHub or Open VSX is not part of the 0.5.0 qualification command
set and requires separate approval.

Qualification evidence captured on 2026-11-08:

- `npm run language:validate`: passed with zero errors and one documented
  warning for 191 normalized-input occurrences in 32 files. Ownership remains
  with MyDefrag Syntax locale data, maintained through MdmLocalize.
- `npm run test:fast`: 188 named tests passed across all 12 selected checks.
- `npm run test:all`: 317 named tests passed across all 15 checks, including
  JavaScript syntax, PowerShell syntax, coverage, language, application, and
  report gates.
- `npm run test:manifest`: 14 named tests passed, including the VSIX runtime
  asset and exclusion contract.
- `git diff --check`: no whitespace errors; Git reported only reviewed
  LF-to-CRLF conversion warnings.
- `npm run pack:vsix`: created a 2,509,402-byte 0.5.0 package containing 1,519
  entries. The package includes the extension entry point, grammar, snippets,
  English and `fr-CA` catalogs, converted hover Help, and
  `vscode-languageclient`; it contains no `artifacts` subtree or workspace test
  modules. All five declared runtime dependency packages are present.
- VSCE emitted a non-blocking bundling/performance recommendation for the 1,519
  files and 354 JavaScript files. Future package-size optimization belongs to
  the MyDefrag Syntax package component; it does not invalidate this artifact.
- Package SHA-256:
  `715665186F261F395A94275413224665989B810828C3AC721591CF9ADB820853`.
- The first packaged-host smoke exposed and stopped on
  `server.js:onInitialize: ... uiLocale is not defined`. The unused assignment
  was removed and the server integration lane now rejects initialization
  errors.
- `codium --list-extensions --show-versions` reports
  `macrodm.mydefrag-syntax@0.5.0` after forced installation from the inspected
  VSIX.
- The repeated isolated-profile smoke activated on `onLanguage:mydfrg`,
  initialized the extension, registered providers, started the language
  client, opened the `.MyD` fixture, and observed the packaged server process.
  The extension and language-client logs contained no targeted runtime errors,
  and all VSCodium processes were closed after the run.
- Packaged-host logs are retained under
  `artifacts\vscodium-smoke-0.5.0\run-fixed-20261108-161212\profile\logs`.
- This is baseline host coverage. Interactive verification of both language
  extensions, diagnostics, hover, all five preview modes, and include-error UI
  remains part of the extended smoke matrix above.

## Version 0.6.0 - Editor Intelligence

Status: Implemented and source/package/installed-host qualified. VSCodium has
the exact inspected 0.6.0 VSIX installed.

Objectives:

- Replace the LSP completion stub with context-aware server completion, or make
  a documented decision that completion remains client-owned.
- Add safe code-action infrastructure for diagnostics that have deterministic
  edits.
- Add missing or invalid source-language directive actions after the directive
  contract is defined.
- Preserve existing snippets and client-side inline prediction behavior.

Acceptance criteria:

- The server no longer advertises behavior it returns only as an unexplained
  empty result.
- Completion ownership is covered by integration tests.
- Code actions are idempotent, previewable, and restricted to the intended
  document or workspace scope.
- Fix All is offered only for operations proven safe when combined.

Implementation contract:

- The server owns standard LSP completion and returns context-first keyword
  edits from the same canonical language data used by editor assistance.
- The extension host retains inline ghost-text prediction, and snippets remain
  available independently.
- The canonical source-language directive is
  `// @mydfrg-language <locale>`. The `//`, `#`, `--`, and `REM` line-comment
  forms are accepted because MyDefrag treats them as comments. The older
  semicolon example is diagnosed and corrected because semicolon is not a
  MyDefrag comment delimiter.
- Locale identifiers are checked against `language/locales/locales.json`,
  including canonical case.
- Missing directives produce a hint. Invalid syntax, unknown or incorrectly
  cased locales, and duplicate directives produce warnings.
- Quick fixes edit only the requesting document. The namespaced
  `source.fixAll.mydfrgLanguage` action recomputes current document state and
  combines only deterministic directive corrections.

Implementation evidence:

- `npm run test:editor-intelligence`: 10 of 10 named tests passed.
- The live JSON-RPC integration test verifies advertised completion and code
  action capabilities, a `Mounted(yes)` completion edit, the missing-directive
  diagnostic, and the URI-scoped quick fix.
- Reapplying a missing-directive fix produces a document with no remaining
  directive diagnostic; Fix All is also covered for invalid-plus-duplicate
  input.
- `npm run test:all`: all 339 named tests passed across 149 executions and all
  16 selected checks.
- `npm run pack:vsix`: built a 2,513,966-byte package containing 1,521 files.
  Both embedded manifests declare 0.6.0; the required completion and directive
  modules are present; test files and `package-lock.json` are absent.
- The exact versioned artifact SHA-256 is
  `763D7CFF4C196601BDA2AE33B4987FB6115E7756A78102AD06BBB9BB375C7BCD`.
- Forced installation completed and `codium --list-extensions --show-versions`
  reports `macrodm.mydefrag-syntax@0.6.0`.
- A fresh isolated profile and extension store activated the packaged extension
  on `onLanguage:mydfrg`, initialized the packaged language server, and produced
  zero targeted runtime errors. Evidence is retained under
  `artifacts\vscodium-smoke-0.6.0\run-20261108-1824\profile\logs`.
- All eight VSCodium processes started for the packaged-host smoke were closed;
  no VSCodium process remained afterward.

## Version 0.7.0 - Non-Destructive Keyword Translation

Status: Implemented.

Objectives:

- Integrate generated keyword maps into a syntax-aware translation service.
- Convert localized source to canonical MyDefrag source.
- Render canonical source into a selected supported locale.
- Consume the approved `// @mydfrg-language <locale>` directive in the
  translation service.
- Preserve strings, comments, paths, macros, formatting, include relationships,
  and source mappings.
- Reject ambiguous or colliding keyword translations.
- Provide `MyDefrag: Preview Canonical` and `MyDefrag: Preview Localized` as
  editable generated documents without changing source.
- Provide bilingual localized/canonical hover with review or fallback status.

Acceptance criteria:

- Round-trip conversion is deterministic for the supported syntax subset.
- Canonical output parses and validates with the existing parser.
- No translation path uses unrestricted global search and replace.
- Unsupported or ambiguous input produces evidence-based diagnostics without
  modifying source.
- Every registered locale has a complete 243-entry keyword file: 214 visible
  source keywords and 29 hidden internal grammar labels.
- Included files inherit the root locale unless they declare one valid local
  override; child directives are consumed in expanded output.

Validation evidence:

- `npm run language:validate`: passed with zero errors and the existing
  normalized-input warning.
- `npm run test:all`: all 368 named tests passed across 156 executions and all
  16 selected checks.
- `npm run pack:vsix`: produced a 2,722,312-byte package with 1,578 entries;
  both embedded manifests declare 0.7.0.
- Package inspection confirmed runtime keyword maps, the translation service,
  the translation preview service, and locale registry are included; tests and
  `package-lock.json` are excluded.
- An isolated VSCodium profile installed `macrodm.mydefrag-syntax@0.7.0`,
  activated it on `onLanguage:mydfrg`, initialized the language server, and
  produced zero targeted extension errors. Evidence is under
  `artifacts\vscodium-smoke-0.7.0\run-20261108-190759\profile\logs`.
- The packaged artifact SHA-256 is
  `F0F3AFA2870A2A8DEA700700C990B9528891E5813E1646D3442E25004BCA24B9`.

## Version 0.8.0 - Translation Review Workbench

Status: Implemented and source/package qualified. Installation and the
packaged-host workflow matrix remain open because installation was not
authorized.

Retain the five original preview variations and the 0.7 canonical and localized
previews, then add separate review purposes:

- Bilingual localized and canonical preview.
- Semantic-ID preview.
- Difference preview.
- Terminology, untranslated-token, and completeness review views.

Acceptance criteria:

- Executable output contains no generated annotations.
- Diagnostic views remain editable untitled documents and do not overwrite
  source files.
- Every generated line can be traced to its source file and source line where
  practical.
- Preview modes use the same canonical translation service as source conversion.
- Missing and circular includes remain visible and testable.

Implementation evidence:

- The single Preview submenu now exposes thirteen commands: five original
  include views, two executable translation previews, and six non-executable
  review views.
- Bilingual, semantic-ID, and difference output retains source file, line, and
  column evidence where a mapping exists. Terminology rows retain first-use
  locations, and generated-only review content is labeled.
- Terminology and untranslated-token views use all 214 visible, translatable
  entries for the selected locale. Completeness reports catalog status,
  fallback use, and expanded-source coverage.
- Missing and circular include directives remain in executable output with
  stable diagnostics; no generated comment annotations are inserted.
- The focused translation-preview, review, and manifest command passed all 18
  named tests.
- `npm run test:all` passed all 378 named tests across 159 executions and all
  16 selected checks.
- `npm run language:validate` passed with zero errors and the existing partial
  normalized-input warning for 191 occurrences in 32 files.
- `npm run pack:vsix` produced a 2,726,131-byte package with 1,579 entries.
  Package inspection confirmed version 0.8.0 in both manifests, included
  `src/shared/translationReview.js`, and excluded tests and `package-lock.json`.
- The packaged artifact SHA-256 is
  `C13017B0571F140B4EBF7D1FA47C820C88B0E519C3085E58B8165CC474298932`.
- Installation and packaged-host runtime smoke were not run because this task
  did not authorize installation.

## Version 0.9.0 - Localization And Compatibility Qualification

Status: Proposed pre-release qualification.

Entry state:

- The 0.8.0 source and package gates pass, but the exact 0.8.0 VSIX has not been
  installed or exercised in a packaged host.
- The 0.7.0 and 0.8.0 implementation remains an uncommitted 99-entry working
  tree and must be made recoverable before overlapping feature work begins.
- The multilingual roadmap still marks implemented Phase 3 conversion tasks as
  incomplete, and the normalized-input gate and retained JSON report disagree
  by one occurrence.

Objectives:

- Qualify the exact 0.8.0 package in an isolated VSCodium profile after explicit
  installation authorization.
- Reconcile roadmap, tracker, generated-report, and user-documentation claims
  against the implemented 0.8.0 behavior.
- Add deterministic source conversion actions only after preview output and
  diagnostics prove the proposed edit is safe.
- Build declaration and reference indexing for project-scoped variables.
- Assign stable symbol identities and translate declarations and references
  without collisions.
- Generate and validate a fully French (Quebec) TaylorDo source tree, while
  keeping TaylorDo execution ownership outside this repository.
- Reduce the current 1,649 fallback entries and review the 12,098
  machine-generated entries.
- Resolve the 191 normalized-input audit occurrences.
- Obtain native review for release-target locales.
- Validate right-to-left, combining-mark, capitalization, punctuation, and
  Unicode behavior.
- Test Windows 8+ compatibility, offline operation, low-memory operation, and
  component-only catalog loading.

Implementation sequence:

1. Protect the current working-tree baseline and separate authored language
   inputs, generated keyword files, runtime maps, source, tests, and documents
   into reviewable groups.
2. With installation authorization, install the exact hashed 0.8.0 VSIX in an
   isolated profile and exercise activation, diagnostics, hover, all thirteen
   Preview submenu commands, and missing and circular include behavior.
3. Reconcile the canonical multilingual roadmap, feature and installation
   guides, trackers, and generated audit summaries with the validated package.
4. Implement preview-backed file conversion actions and safe project symbol
   indexing before enabling declaration and reference rewrites.
5. Generate the French (Quebec) TaylorDo tree as a reviewable output, validate
   canonical round-trip behavior, and leave real TaylorDo execution to its
   owning project.
6. Resolve or explicitly defer fallback, machine-generated, normalized-input,
   native-review, Unicode, right-to-left, compatibility, offline, and
   low-resource findings.
7. Re-run the full source, package-inventory, package, and packaged-host gates
   on one exact candidate.

Acceptance criteria:

- The exact 0.8.0 package passes the authorized isolated-host workflow matrix
  before 0.9.0 feature work begins; without installation authorization, the
  0.9.0 entry gate remains pending rather than waived.
- Active roadmaps and generated reports agree with current implementation and
  validation results.
- Release-target locales have an explicit approved or deferred status.
- Variable translation preserves declaration/reference identity across includes.
- Canonical output remains the only execution target supplied to MyDefrag.
- Compatibility results identify the tested operating system, editor, Node.js,
  memory profile, and limitations.
- Modern UI and AI-assisted translation remain optional enhancements.

## Version 1.0.0 - Public Release

Status: Planned milestone; not release-ready.

Release tasks:

- Complete final repository cleanup without deleting unclassified user work.
- Review all user, developer, architecture, installation, testing, and release
  documentation.
- Decide whether all 142 converted Help topics are a hard 1.0 gate or a
  separately versioned review program.
- Produce release notes from verified implementation and test evidence.
- Run all validation gates on the exact release commit.
- Build a fresh VSIX from that commit and verify its contents and hash.
- Install the exact artifact in VSCodium and repeat the packaged-host smoke test.
- Create the GitHub release only after explicit approval.
- Publish to Open VSX only after explicit approval and credential readiness.
- Record the released commit, package version, artifact hash, editor version,
  test results, and publication identifiers.

Release eligibility requires:

- A clean, explainable Git state.
- Zero required test failures.
- No unresolved release-blocking diagnostics.
- Documentation that matches packaged behavior.
- A recoverable artifact and retained validation evidence.
- Explicit approval for every external publication action.

## Version 1.1.0 And Later

Status: Proposed post-release program.

Potential work:

- Collect and triage user feedback.
- Track defects and enhancement requests in one authoritative system.
- Add locale status dashboards and contributor recognition.
- Improve translation contribution and native-review workflows.
- Expand approved terminology and supported locales.
- Revisit performance, memory, and compatibility evidence with real workloads.
- Add only enhancements that preserve canonical execution and project
  separation.

Version 1.1 scope should be selected from observed 1.0 usage rather than treated
as a commitment before 1.0 is released.

## Validation Gates

<!-- markdownlint-disable MD013 -->

| Gate | Required command or activity | Required result |
| --- | --- | --- |
| JavaScript syntax | `npm run test:scripts` | Zero syntax failures |
| Language definitions | `npm run language:validate` | Zero errors; warnings assigned and documented |
| Fast developer gate | `npm run test:fast` | Zero failures |
| Full repository gate | `npm run test:all` | Zero failures |
| Extension manifest | `npm run test:manifest` | Commands, menus, grammar, language, and settings resolve |
| Locale Maintenance | `npm run test:locale-app` | Zero failures |
| Language tooling | `npm run test:language:all` | Validation, runtime, and report checks pass |
| Whitespace | `git diff --check` | Zero whitespace errors |
| Package inventory | `npx vsce ls` | Every required runtime file is listed |
| VSIX package | `npm run pack:vsix` | Exact expected artifact exists and is fresh |
| Development Host | Run Extension configuration | Activation and editor workflows pass |
| Packaged host | Install exact VSIX | Installed version and smoke workflows pass |

<!-- markdownlint-enable MD013 -->

Tests that write reports or generated outputs must be run only after the
working-tree baseline is captured. Any post-test change must be classified as
an expected artifact or an unexpected mutation.

## Documentation And Release Gates

Documentation is complete for a version only when:

- The documentation index links to every supported guide and contains no broken
  project links.
- Commands are copyable and use concrete repository paths.
- Prerequisites and expected results are stated.
- Source behavior, packaged behavior, and MyDefrag runtime behavior are not
  conflated.
- Current limitations and untested boundaries are explicit.
- Version claims match `package.json` and the installed artifact.
- Generated reports state their source inputs and generation command.
- Markdown structure and relative links validate.

Release evidence must identify:

- Commit ID.
- Package version.
- VSIX path, size, timestamp, and SHA-256 hash.
- VSCodium version.
- Installed extension version.
- Test commands and exact pass/fail totals.
- Warnings, deferred items, and approval boundaries.

## Risks And Controls

<!-- markdownlint-disable MD013 -->

| Risk | Current evidence | Control |
| --- | --- | --- |
| Loss of uncommitted work | 99 Git status entries: 73 tracked modifications and 26 untracked paths | Preserve the current baseline and classify every path before staging, moving, or deleting |
| Generated-source confusion | 18 locale keyword files and 36 runtime maps are generated from canonical inputs and locale overrides | Stage authoritative inputs, generator changes, and reproducible outputs as one reviewed unit |
| Cross-project duplication | Language Maintenance moved to `D:\MdmLocalize` | Route application-owned issues to one project |
| Include-resolution regression | Entry-root preservation now passes nested mixed-extension fixtures | Retain immutable entry-root tests in every preview and translation gate |
| Translation corruption | Runtime-syntax protection now passes all 67 Locale Maintenance tests | Keep one shared token contract and require exact restoration and round-trip tests |
| Unreviewed localization | 12,098 machine-generated entries | Native-review status and release-target criteria |
| Roadmap drift | The multilingual Phase 3 task list still marks implemented conversion work incomplete | Reconcile active checklists against source and retained test evidence before 0.9.0 starts |
| Generated-report drift | Latest validation reports 191 normalized-input occurrences while retained JSON records 190 | Regenerate from the authoritative inputs, review the one-item delta, and retain matching evidence |
| Installed-version skew | Source and package are 0.8.0, the primary profile is 0.6.0, and the latest isolated-host smoke is 0.7.0 | Qualify the exact 0.8.0 VSIX in an isolated profile after explicit installation authorization |
| Documentation overclaim | Converted Help has 142 pending reviews | Separate conversion from independent review |
| Line-ending churn | Git reports widespread LF-to-CRLF warnings | Review attributes and avoid unrelated normalization |
| Unauthorized publication | Publish scripts and credentials can affect external systems | Require explicit approval for GitHub or Open VSX writes |

<!-- markdownlint-enable MD013 -->

## Decisions Required

The following decisions are required before the proposed version map becomes a
release commitment:

1. Approve or revise the proposed 0.9.0 version boundary.
2. Define which locales must be native-reviewed for 1.0.0.
3. Decide whether review of all 142 converted Help topics blocks 1.0.0.
4. Select the authoritative issue tracker after `ToDo.txt` ownership triage.
5. Approve the staging and checkpoint grouping for the current 0.7.0 and 0.8.0
   working tree.
6. Authorize isolated installation and packaged-host smoke of the exact 0.8.0
   VSIX when that gate should run.
7. Authorize Git commit, Git push, GitHub release, and Open VSX
   publication separately when those actions are desired.

## Completion Definition

This implementation program is complete when:

- The current release working tree has been reconciled and qualified.
- Every shipped version passes its defined source and packaged-host gates.
- Versioned scope, documentation, package contents, and installed behavior agree.
- Localization status distinguishes approved, native-review-required, draft,
  fallback, and machine-generated content.
- MyDefrag Syntax, MdmLocalize, TaylorDo, and MyDefrag ownership boundaries are
  preserved.
- The 1.0.0 release artifact and validation evidence are retained and
  reproducible.
- Post-release work is selected from evidence rather than stale checklist text.

## Evidence Sources

This plan was built from the following current project evidence:

- [`package.json`](../package.json)
- [`ToDo.txt`](../ToDo.txt)
- [`MyDefrag-syntax ToDo.md`](<../MyDefrag-syntax ToDo.md>)
- [`MyDefrag-Multilingual-Feature-Project.md`](../MyDefrag-Multilingual-Feature-Project.md)
- [`testing.md`](testing.md)
- [`features.md`](features.md)
- [`install.md`](install.md)
- [`REVIEW-INDEX.md`](<MyDefrag Help/REVIEW-INDEX.md>)
- [`mydefrag-preprocess.js`](../src/preprocess/mydefrag-preprocess.js)
- [`server.js`](../src/server/server.js)
- [`sourceTranslation.js`](../src/shared/sourceTranslation.js)
- [`translationPreview.js`](../src/shared/translationPreview.js)
- [`translationReview.js`](../src/shared/translationReview.js)
- [`translation-completeness.json`](../build/language/reports/translation-completeness.json)
- [`normalized-input-audit.json`](../build/language/reports/normalized-input-audit.json)
- [2026-11-08 development-status execution record](../.AI/runs/2026-11-07/Ad-hoc-prompt_20261107-1837_6ed0c0d9/execution-record.md)
- [2026-11-08 version 0.7.0 execution record](../.AI/runs/2026-11-08/Implement-the-proposed-plan_20261108-1951_fbd90970/execution-record.md)
- [2026-11-08 version 0.8.0 execution record](../.AI/runs/2026-11-08/Ad-hoc-prompt_20261108-2035_bd326cde/execution-record.md)
