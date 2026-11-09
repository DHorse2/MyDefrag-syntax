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
- [Version 0.7.0 - Canonical Language Translation](#version-070---canonical-language-translation)
- [Version 0.8.0 - Preview Language Workbench](#version-080---preview-language-workbench)
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

| Field | Value |
| --- | --- |
| Document version | 1.2.0 |
| Status | Current working implementation plan |
| Baseline date | 2026-11-08 |
| Project | MyDefrag Syntax |
| Project root | `D:\Script\MyDefrag-syntax` |
| Current source version | 0.5.0 |
| Installed VSCodium extension | `macrodm.mydefrag-syntax@0.5.0` |
| Version authority | 0.5.0 is repository fact; later assignments are proposals |
| Supersedes | No prior consolidated implementation plan |

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

| Status | Meaning |
| --- | --- |
| Verified | Observed in the repository or reproduced on 2026-11-08 |
| In progress | Present in the uncommitted working tree but not release-qualified |
| Planned | Accepted by an existing roadmap but not yet verified as implemented |
| Proposed | Recommended here and requiring approval before it becomes a release commitment |
| Blocked | Cannot pass its gate until a named defect or decision is resolved |
| Out of scope | Owned by another project or intentionally excluded from this plan |

## Current Baseline

| Area | Verified status | Consequence |
| --- | --- | --- |
| Task queue | Idle; zero queued tasks | This plan is an ad hoc authorized document, not a consumed queue task |
| Git branch | `main` at `8ebf3b77`; zero commits ahead or behind `origin/main` | The multilingual checkpoint commit is synchronized |
| Working tree | Clean immediately after `8ebf3b77`; the current diff is the scoped 0.5.0 stabilization implementation | The prior broad worktree has been checkpointed |
| Prior broad diff | The former 426-entry working tree is contained in `8ebf3b77` | New work no longer overlaps an uncommitted repository-wide diff |
| Product version | `package.json` declares 0.5.0 | 0.5.0 is the active stabilization target |
| Installed extension | VSCodium has 0.5.0 installed from the exact inspected VSIX | Baseline packaged-host activation and language-server smoke passed |
| Focused extension tests | 17 of 17 passed | Preview, manifest, server, and URI checks passed in the focused lane |
| Locale Maintenance tests | 67 of 67 passed | Runtime-syntax protection is repaired |
| JavaScript syntax checks | 11 of 11 passed | The checked changed entry points are syntactically valid |
| Language validation | Passed with zero errors and one warning | Normalized-input cleanup remains open |
| Localization data | 18 locales and 10 components | The multilingual foundation exists |
| Non-English approval | 14 locales require native review; 3 are draft | No non-English locale is release-approved |
| Generated localization | 12,098 machine-generated and 1,649 fallback entries | Human review and fallback reduction remain material work |
| Normalized-input audit | 191 occurrences in 32 files | The audit remains partial; the corrected runtime-token boundary exposes one additional `data` occurrence |
| Help review | 142 converted topics are marked pending | Conversion exists, but independent review is unfinished |
| Packaged artifact | Fresh 0.5.0 VSIX at `artifacts\mydefrag-syntax-Release.vsix` | 2,509,402 bytes; SHA-256 `715665186F261F395A94275413224665989B810828C3AC721591CF9ADB820853` |

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

Only version 0.5.0 is currently declared by the repository. The remaining
version targets are proposed sequencing boundaries and may be split or combined
after review.

| Proposed target | Theme | Entry condition | Exit condition |
| --- | --- | --- | --- |
| 0.5.0 | Stabilization and integration | Current dirty working tree | Clean required tests, reconciled scope, fresh verified VSIX |
| 0.6.0 | Editor intelligence | 0.5.0 qualified | LSP completion and safe code-action foundation qualified |
| 0.7.0 | Canonical language translation | Stable editor contracts | Deterministic localized-to-canonical conversion qualified |
| 0.8.0 | Preview language workbench | Translation service qualified | Canonical, localized, bilingual, semantic, and difference previews qualified |
| 0.9.0 | Localization and compatibility qualification | Feature-complete pre-release | Native-review, project-symbol, compatibility, and low-resource gates resolved |
| 1.0.0 | Public release | Release candidate accepted | Documentation, package, install, and publication gates complete |
| 1.1.0+ | Post-release evolution | 1.0.0 released | Feedback-driven maintenance and approved enhancements |

## Implementation Order

Work should proceed in this order:

1. Preserve and classify the current working tree.
2. Repair the two reproducible Locale Maintenance test failures.
3. Correct entry-root include resolution and add regression coverage.
4. Reconcile stale documentation, trackers, generated outputs, and project
   ownership.
5. Run the complete 0.5.0 source gate.
6. Build and inspect the exact 0.5.0 VSIX.
7. Install and smoke-test the VSIX only when installation is authorized.
8. Commit or publish only after explicit authorization.
9. Start 0.6.0 feature work only after the 0.5.0 baseline is recoverable.

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

Status: Proposed.

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

## Version 0.7.0 - Canonical Language Translation

Status: Proposed from the existing multilingual roadmap.

Objectives:

- Integrate generated keyword maps into a syntax-aware translation service.
- Convert localized source to canonical MyDefrag source.
- Render canonical source into a selected supported locale.
- Detect and validate `; @mydfrg-language <locale>` or the final approved
  directive syntax.
- Preserve strings, comments, paths, macros, formatting, include relationships,
  and source mappings.
- Reject ambiguous or colliding keyword translations.

Acceptance criteria:

- Round-trip conversion is deterministic for the supported syntax subset.
- Canonical output parses and validates with the existing parser.
- No translation path uses unrestricted global search and replace.
- Unsupported or ambiguous input produces evidence-based diagnostics without
  modifying source.

## Version 0.8.0 - Preview Language Workbench

Status: Proposed from the existing multilingual roadmap.

Retain the five current preview variations and add separate semantic purposes:

- Canonical executable preview.
- Localized preview.
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

## Version 0.9.0 - Localization And Compatibility Qualification

Status: Proposed pre-release qualification.

Objectives:

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

Acceptance criteria:

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

| Risk | Current evidence | Control |
| --- | --- | --- |
| Loss of uncommitted work | 426 Git status entries | Inventory and classify before staging, moving, or deleting |
| Generated-source confusion | Large language catalog and report diffs | Identify authoritative inputs and reproduce outputs |
| Cross-project duplication | Language Maintenance moved to `D:\MdmLocalize` | Route application-owned issues to one project |
| False preview paths | Child-directory include rebasing | Preserve immutable entry root and add nested fixtures |
| Translation corruption | Two runtime-syntax protection failures | Share token contract and require exact restoration |
| Unreviewed localization | 12,098 machine-generated entries | Native-review status and release-target criteria |
| Stale plans | Implemented features remain unchecked in older plans | Reconcile facts before scheduling later versions |
| Incomplete runtime proof | Process entry points lack packaged-host coverage | Add Extension Host and installed-VSIX lanes |
| Documentation overclaim | Converted Help has 142 pending reviews | Separate conversion from independent review |
| Line-ending churn | Git reports widespread LF-to-CRLF warnings | Review attributes and avoid unrelated normalization |
| Unauthorized publication | Publish scripts and credentials can affect external systems | Require explicit approval for GitHub or Open VSX writes |

## Decisions Required

The following decisions are required before the proposed version map becomes a
release commitment:

1. Approve or revise the proposed 0.6.0 through 0.9.0 version boundaries.
2. Decide whether LSP completion is server-owned, client-owned, or deliberately
   split by capability.
3. Define which locales must be native-reviewed for 1.0.0.
4. Decide whether review of all 142 converted Help topics blocks 1.0.0.
5. Select the authoritative issue tracker after `ToDo.txt` ownership triage.
6. Approve the staging and commit grouping for the current working tree.
7. Authorize installation, Git commit, Git push, GitHub release, and Open VSX
   publication separately when those actions are desired.

## Completion Definition

This implementation program is complete when:

- The current 0.5.0 working tree has been reconciled and qualified.
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
- [`FEATURES.md`](FEATURES.md)
- [`INSTALL.md`](INSTALL.md)
- [`REVIEW-INDEX.md`](<MyDefrag Help/REVIEW-INDEX.md>)
- [`mydefrag-preprocess.js`](../src/preprocess/mydefrag-preprocess.js)
- [`server.js`](../src/server/server.js)
- [`translation-completeness.json`](../build/language/reports/translation-completeness.json)
- [`normalized-input-audit.json`](../build/language/reports/normalized-input-audit.json)
- [2026-11-08 development-status execution record](../.AI/runs/2026-11-07/Ad-hoc-prompt_20261107-1837_6ed0c0d9/execution-record.md)
